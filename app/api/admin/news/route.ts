import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'

const schema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(10),
  image: z.string().url().optional().or(z.literal('')),
  category: z.enum(['Actualización', 'Evento', 'Mantenimiento', 'Comunidad', 'PvP']),
  published: z.boolean().default(false),
  pinned: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const news = await queryCms(
    'SELECT id, slug, title, excerpt, category, published, pinned, views, created_at, author_name FROM cms_news ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  )
  const [{ total }] = await queryCms<{ total: number }>('SELECT COUNT(*) as total FROM cms_news')

  return NextResponse.json({ news, total })
}

export async function POST(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const admin = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  const existing = await queryCms('SELECT id FROM cms_news WHERE slug = ?', [d.slug])
  if ((existing as []).length > 0) return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 })

  await queryCms(
    'INSERT INTO cms_news (slug, title, excerpt, content, image, category, author_id, author_name, published, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [d.slug, d.title, d.excerpt, d.content, d.image || null, d.category, admin.id, admin.username, d.published ? 1 : 0, d.pinned ? 1 : 0]
  )

  return NextResponse.json({ success: true })
}
