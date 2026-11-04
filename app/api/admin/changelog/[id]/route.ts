import { NextRequest, NextResponse } from 'next/server'
import { requireGmLevel } from '@/lib/auth'
import { queryCms, queryCmsFirst } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  version: z.string().min(1).max(20).optional(),
  title: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['patch', 'update', 'hotfix', 'event']).optional(),
  changes: z.array(z.object({ type: z.enum(['NUEVO', 'FIX', 'BALANCE', 'EVENTO']), text: z.string() })).optional(),
})

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

  if (d.version !== undefined) { fields.push('version = ?'); values.push(d.version) }
  if (d.title !== undefined) { fields.push('title = ?'); values.push(d.title) }
  if (d.date !== undefined) { fields.push('date = ?'); values.push(d.date) }
  if (d.type !== undefined) { fields.push('type = ?'); values.push(d.type) }
  if (d.changes !== undefined) { fields.push('changes = ?'); values.push(JSON.stringify(d.changes)) }

  if (fields.length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  values.push(id)
  await queryCms(`UPDATE cms_changelog SET ${fields.join(', ')} WHERE id = ?`, values)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const { id } = await params
  await queryCms('DELETE FROM cms_changelog WHERE id = ?', [id])
  return NextResponse.json({ success: true })
}
