import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { queryCms, executeCms } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { cleanMessage, normPriority } from '@/lib/tickets.server'

const createSchema = z.object({
  category: z.enum(['Bug', 'Donación', 'Ban', 'Personaje Atascado', 'Tienda', 'Otro']),
  subject: z.string().trim().min(5, 'El asunto debe tener al menos 5 caracteres').max(255),
  message: z.string().trim().min(10, 'Contanos un poco más (mínimo 10 caracteres)').max(5000),
  character: z.string().trim().max(50).optional(),
})

/** Player's own tickets, with the number of GM replies not seen yet (for notifications). */
export async function GET(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  const tickets = await queryCms<Record<string, unknown>>(
    `SELECT t.id, t.category, t.subject, t.status, t.priority, t.created_at, t.last_reply_at, t.character_name,
            (SELECT COUNT(*) FROM cms_ticket_replies r WHERE r.ticket_id = t.id AND r.is_gm = 1 AND r.id > t.player_seen_reply_id) AS unread
     FROM cms_tickets t WHERE t.account_id = ? ORDER BY COALESCE(t.last_reply_at, t.created_at) DESC`,
    [user.id]
  )
  return NextResponse.json({
    tickets: tickets.map(t => ({ ...t, priority: normPriority(t.priority as string), unread: Number(t.unread ?? 0) })),
  })
}

export async function POST(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  const rl = rateLimit(`ticket-create:${user.id}`, 5, 60 * 60 * 1000)
  if (!rl.success) return NextResponse.json({ error: 'Creaste varios tickets seguidos. Esperá un rato antes de abrir otro.' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { category, subject, message, character } = parsed.data

  const r = await executeCms(
    'INSERT INTO cms_tickets (account_id, character_name, category, subject, message) VALUES (?, ?, ?, ?, ?)',
    [user.id, character || null, category, cleanMessage(subject, 255), cleanMessage(message, 5000)]
  )
  return NextResponse.json({ success: true, id: r.insertId })
}
