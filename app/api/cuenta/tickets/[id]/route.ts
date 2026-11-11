import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getTicket, getMessages, markPlayerSeen, normPriority, playerReply } from '@/lib/tickets.server'
import { actionErrorResponse, parsePositiveInt, readJson } from '@/lib/gm/http.server'

type Ctx = { params: Promise<{ id: string }> }

async function ownTicket(req: NextRequest, raw: string) {
  const user = await requireAuth(req)
  if (user instanceof Response) return { error: user }
  const id = parsePositiveInt(raw)
  if (!id) return { error: NextResponse.json({ error: 'Ticket inválido.' }, { status: 400 }) }
  const t = await getTicket(id)
  // Same 404 for "not yours" and "does not exist": ticket ids of others are not disclosed
  if (!t || t.account_id !== user.id) return { error: NextResponse.json({ error: 'Ticket no encontrado.' }, { status: 404 }) }
  return { user, t }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const r = await ownTicket(req, (await params).id)
  if ('error' in r) return r.error
  const messages = await getMessages(r.t)
  await markPlayerSeen(r.t.id)
  const { message: _opening, ...ticket } = r.t
  void _opening
  return NextResponse.json({ ticket: { ...ticket, priority: normPriority(r.t.priority) }, messages })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const r = await ownTicket(req, (await params).id)
  if ('error' in r) return r.error
  const rl = rateLimit(`ticket-reply:${r.user.id}`, 30, 10 * 60 * 1000)
  if (!rl.success) return NextResponse.json({ error: 'Enviaste muchos mensajes seguidos. Esperá unos minutos.' }, { status: 429 })
  const body = (await readJson(req)) as { message?: unknown } | null
  if (typeof body?.message !== 'string') return NextResponse.json({ error: 'Escribí un mensaje.' }, { status: 400 })
  try {
    const id = await playerReply(r.user.id, r.user.username, r.t.id, body.message)
    return NextResponse.json({ success: true, id })
  } catch (err) {
    return actionErrorResponse(err, 'tickets:player-reply')
  }
}
