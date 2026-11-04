import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'

const schema = z.object({
  item_entry: z.number().int().positive().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  price_coins: z.number().int().positive().optional(),
  category: z.enum(['Montura', 'Mascota', 'Cosmético', 'Título', 'Servicio', 'Otro']).optional(),
  image: z.string().url().optional().or(z.literal('')),
  active: z.boolean().optional(),
  stock: z.number().int().optional(),
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

  if (d.item_entry !== undefined) { fields.push('item_entry = ?'); values.push(d.item_entry) }
  if (d.name !== undefined) { fields.push('name = ?'); values.push(d.name) }
  if (d.description !== undefined) { fields.push('description = ?'); values.push(d.description) }
  if (d.price_coins !== undefined) { fields.push('price_coins = ?'); values.push(d.price_coins) }
  if (d.category !== undefined) { fields.push('category = ?'); values.push(d.category) }
  if (d.image !== undefined) { fields.push('image = ?'); values.push(d.image || null) }
  if (d.active !== undefined) { fields.push('active = ?'); values.push(d.active ? 1 : 0) }
  if (d.stock !== undefined) { fields.push('stock = ?'); values.push(d.stock) }

  if (fields.length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  values.push(id)
  await queryCms(`UPDATE cms_shop_items SET ${fields.join(', ')} WHERE id = ?`, values)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const { id } = await params
  await queryCms('DELETE FROM cms_shop_items WHERE id = ?', [id])
  return NextResponse.json({ success: true })
}
