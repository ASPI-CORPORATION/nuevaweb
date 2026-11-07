import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { queryCmsFirst, executeCms } from '@/lib/db'
import { newsPatchSchema, publishProblem, dbErrorResponse, logContentAction } from '@/lib/news.server'
import { sanitizeRichHtml, makeExcerpt } from '@/lib/sanitize'
import { slugify } from '@/lib/content-config'
import { revalidateNewsPages } from '@/lib/revalidate'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

interface NewsRow {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string
  image: string | null
  category: string
  published: number
  pinned: number
}

function parseId(raw: string) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireRole(req, 'admin')
  if (result instanceof Response) return result
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const news = await queryCmsFirst('SELECT * FROM cms_news WHERE id = ?', [id])
  if (!news) return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 })
  return NextResponse.json({ news })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireRole(req, 'admin')
  if (admin instanceof Response) return admin
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const parsed = newsPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const p = parsed.data
  if (Object.keys(p).length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })

  const current = await queryCmsFirst<NewsRow>('SELECT * FROM cms_news WHERE id = ?', [id])
  if (!current) return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 })

  const content = p.content !== undefined ? sanitizeRichHtml(p.content) : current.content
  const next = {
    title: p.title ?? current.title,
    // URL stays stable on title edits; only changes when the slug is edited explicitly
    slug: p.slug !== undefined ? slugify(p.slug || p.title || current.title) : current.slug,
    content,
    excerpt: p.excerpt !== undefined
      ? (p.excerpt || makeExcerpt(content, 300)).slice(0, 500)
      : (current.excerpt ?? makeExcerpt(content, 300)),
    image: p.image !== undefined ? (p.image || null) : current.image,
    category: p.category ?? current.category,
    published: p.published ?? !!current.published,
    pinned: p.pinned ?? !!current.pinned,
  }
  if (next.slug.length < 3) return NextResponse.json({ error: 'El slug debe tener al menos 3 caracteres' }, { status: 400 })
  if (next.published) {
    const problem = publishProblem(next)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  }

  try {
    await executeCms(
      `UPDATE cms_news SET title = ?, slug = ?, excerpt = ?, content = ?, image = ?, category = ?,
              published = ?, pinned = ?, updated_at = NOW()
       WHERE id = ?`,
      [next.title, next.slug, next.excerpt, next.content, next.image, next.category,
        next.published ? 1 : 0, next.pinned ? 1 : 0, id]
    )
  } catch (err) {
    return dbErrorResponse(err, 'news:update')
  }

  let action = 'NEWS_UPDATE'
  if (!current.published && next.published) action = 'NEWS_PUBLISH'
  else if (current.published && !next.published) action = 'NEWS_UNPUBLISH'
  const { normalizedIp } = normalizeIP(getClientIP(req.headers))
  await logContentAction(admin.id, action, `${admin.username} modificó la noticia #${id} "${next.title}"`, normalizedIp)
  revalidateNewsPages([current.slug, next.slug])

  return NextResponse.json({ success: true, slug: next.slug, published: next.published, pinned: next.pinned })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireRole(req, 'admin')
  if (admin instanceof Response) return admin
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const current = await queryCmsFirst<NewsRow>('SELECT id, slug, title FROM cms_news WHERE id = ?', [id])
  if (!current) return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 })

  try {
    await executeCms('DELETE FROM cms_news WHERE id = ?', [id])
  } catch (err) {
    return dbErrorResponse(err, 'news:delete')
  }
  const { normalizedIp } = normalizeIP(getClientIP(req.headers))
  await logContentAction(admin.id, 'NEWS_DELETE', `${admin.username} eliminó la noticia #${id} "${current.title}"`, normalizedIp)
  revalidateNewsPages([current.slug])
  return NextResponse.json({ success: true })
}
