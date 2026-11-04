import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { queryCms } from '@/lib/db'

const createSchema = z.object({
  category: z.enum(['Bug', 'Donación', 'Ban', 'Personaje Atascado', 'Tienda', 'Otro']),
  subject: z.string().min(5).max(255),
  message: z.string().min(10).max(5000),
  character: z.string().max(50).optional(),
})

export async function GET(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  const tickets = await queryCms(
    'SELECT id, category, subject, status, priority, created_at FROM cms_tickets WHERE account_id = ? ORDER BY created_at DESC',
    [user.id]
  )

  return NextResponse.json({ tickets })
}

export async function POST(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { category, subject, message, character } = parsed.data

  await queryCms(
    'INSERT INTO cms_tickets (account_id, character_name, category, subject, message) VALUES (?, ?, ?, ?, ?)',
    [user.id, character || null, category, subject, message]
  )

  return NextResponse.json({ success: true })
}
