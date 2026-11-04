import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryCms, queryCmsFirst } from '@/lib/db'

const schema = z.object({
  title: z.string().min(3).max(200).optional(),
  excerpt: z.string().min(10).max(500).optional(),
  content: z.string().min(10).optional(),
  image: z.string().url().optional().or(z.literal('')),
  category: z.enum(['Actualización', 'Evento', 'Mantenimiento', 'Comunidad', 'PvP']).optional(),
  published: z.boolean().optional(),
  pinned: z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const { id } = await params
  const news = await queryCmsFirst('SELECT * FROM cms_news WHERE id = ?', [id])
  if (!news) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json({ news })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  const fields: string[] = []
  const values: unknown[] = []

  if (d.title !== undefined) { fields.push('title = ?'); values.push(d.title) }
  if (d.excerpt !== undefined) { fields.push('excerpt = ?'); values.push(d.excerpt) }
  if (d.content !== undefined) { fields.push('content = ?'); values.push(d.content) }
  if (d.image !== undefined) { fields.push('image = ?'); values.push(d.image || null) }
  if (d.category !== undefined) { fields.push('category = ?'); values.push(d.category) }
  if (d.published !== undefined) { fields.push('published = ?'); values.push(d.published ? 1 : 0) }
  if (d.pinned !== undefined) { fields.push('pinned = ?'); values.push(d.pinned ? 1 : 0) }

  if (fields.length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  fields.push('updated_at = NOW()')
  values.push(id)

  await queryCms(`UPDATE cms_news SET ${fields.join(', ')} WHERE id = ?`, values)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const { id } = await params
  await queryCms('DELETE FROM cms_news WHERE id = ?', [id])
  return NextResponse.json({ success: true })
}
