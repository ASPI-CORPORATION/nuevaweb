import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGm, gmRateLimit } from '@/lib/gm/access.server'
import { getTicket, getMessages, gmTicketAction, normPriority, TICKET_PRIORITIES } from '@/lib/tickets.server'
import { actionErrorResponse, parsePositiveInt, readJson } from '@/lib/gm/http.server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireGm(req, 'viewTickets')
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'Ticket inválido.' }, { status: 400 })
  try {
    const t = await getTicket(id)
    if (!t) return NextResponse.json({ error: 'Ticket no encontrado.' }, { status: 404 })
    const messages = await getMessages(t)
    return NextResponse.json({
      ticket: { ...t, priority: normPriority(t.priority) },
      messages,
      viewer: { id: ctx.user.id, username: ctx.user.username, tier: ctx.tier },
    })
  } catch (err) {
    return actionErrorResponse(err, 'tickets:get')
  }
}

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('review') }),
  z.object({ action: z.literal('reply'), message: z.string().min(1).max(4000) }),
  z.object({ action: z.literal('reject'), reason: z.string().min(1).max(500) }),
  z.object({ action: z.literal('close'), message: z.string().max(4000).optional() }),
  z.object({ action: z.literal('reopen') }),
  z.object({ action: z.literal('priority'), priority: z.enum(TICKET_PRIORITIES) }),
  z.object({ action: z.literal('reassign'), gmAccountId: z.number().int().positive().nullable() }),
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireGm(req, 'manageTickets')
  if (ctx instanceof Response) return ctx
  const limited = gmRateLimit(ctx, 'tickets', 120)
  if (limited) return limited
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'Ticket inválido.' }, { status: 400 })
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  try {
    const r = await gmTicketAction(ctx, id, parsed.data)
    return NextResponse.json({ success: true, ...r })
  } catch (err) {
    return actionErrorResponse(err, `tickets:${parsed.data.action}`)
  }
}
