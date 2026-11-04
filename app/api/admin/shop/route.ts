import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'

const schema = z.object({
  item_entry: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price_coins: z.number().int().positive(),
  category: z.enum(['Montura', 'Mascota', 'Cosmético', 'Título', 'Servicio', 'Otro']),
  image: z.string().url().optional().or(z.literal('')),
  active: z.boolean().default(true),
  stock: z.number().int().default(-1),
})

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result
  const items = await queryCms('SELECT * FROM cms_shop_items ORDER BY category, name')
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  await queryCms(
    'INSERT INTO cms_shop_items (item_entry, name, description, price_coins, category, image, active, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [d.item_entry, d.name, d.description ?? null, d.price_coins, d.category, d.image || null, d.active ? 1 : 0, d.stock]
  )
  return NextResponse.json({ success: true })
}
