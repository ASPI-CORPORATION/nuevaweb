import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { queryCms, executeCms } from '@/lib/db'
import { newsInputSchema, prepareNews, publishProblem, dbErrorResponse, logContentAction } from '@/lib/news.server'
import { revalidateNewsPages } from '@/lib/revalidate'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

export async function GET(req: NextRequest) {
  const result = await requireRole(req, 'admin')
  if (result instanceof Response) return result

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1') || 1)
  const status = sp.get('status')
  const q = sp.get('q')?.trim() ?? ''
  const limit = 20
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: unknown[] = []
  if (status === 'published') where.push('published = 1')
  if (status === 'draft') where.push('published = 0')
  if (q) { where.push('title LIKE ?'); params.push(`%${q}%`) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const news = await queryCms(
      `SELECT id, slug, title, excerpt, image, category, published, pinned, views, created_at, updated_at, author_name
       FROM cms_news ${whereSql} ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    const [{ total }] = await queryCms<{ total: number }>(`SELECT COUNT(*) AS total FROM cms_news ${whereSql}`, params)
    return NextResponse.json({ news, total: Number(total), limit })
  } catch (err) {
    return dbErrorResponse(err, 'news:list')
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireRole(req, 'admin')
  if (admin instanceof Response) return admin

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = newsInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = prepareNews(parsed.data)
  if (d.slug.length < 3) return NextResponse.json({ error: 'El slug debe tener al menos 3 caracteres' }, { status: 400 })
  if (d.published) {
    const problem = publishProblem(d)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  }

  try {
    const res = await executeCms(
      `INSERT INTO cms_news (slug, title, excerpt, content, image, category, author_id, author_name, published, pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.slug, d.title, d.excerpt, d.content, d.image, d.category, admin.id, admin.username, d.published ? 1 : 0, d.pinned ? 1 : 0]
    )
    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logContentAction(admin.id, d.published ? 'NEWS_PUBLISH' : 'NEWS_DRAFT', `${admin.username} creó la noticia #${res.insertId} "${d.title}"`, normalizedIp)
    revalidateNewsPages([d.slug])
    return NextResponse.json({ success: true, id: res.insertId, slug: d.slug, published: d.published })
  } catch (err) {
    return dbErrorResponse(err, 'news:create')
  }
}
