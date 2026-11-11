import { NextRequest } from 'next/server'
import { getSessionFromRequest, getAccountAccess } from '@/lib/auth'
import { tierOfAccess } from '@/lib/gm/access.server'
import { getTicket, getMessages, markPlayerSeen, normPriority } from '@/lib/tickets.server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POLL_MS = 2000
const HEARTBEAT_MS = 15000
// Streams end periodically; EventSource reconnects with Last-Event-ID, so nothing is lost or duplicated
const MAX_LIFETIME_MS = 5 * 60 * 1000

/**
 * Server-Sent Events for one ticket. Allowed: the ticket owner or any GM (tier ≥ 1).
 * Events: `message` (id = reply id, so the browser's Last-Event-ID resumes exactly where it
 * stopped) and `status` (ticket status / assignee / priority changes).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(req)
  if (!session) return new Response('No autenticado', { status: 401 })
  const ticketId = Number((await params).id)
  if (!Number.isInteger(ticketId) || ticketId <= 0) return new Response('Ticket inválido', { status: 400 })

  const ticket = await getTicket(ticketId)
  if (!ticket) return new Response('Ticket no encontrado', { status: 404 })
  const isOwner = ticket.account_id === session.id
  const isGm = !isOwner && tierOfAccess(await getAccountAccess(session.id)) >= 1
  if (!isOwner && !isGm) return new Response('No tenés autorización para ver este ticket.', { status: 403 })

  const fromHeader = Number(req.headers.get('last-event-id') ?? NaN)
  const fromQuery = Number(req.nextUrl.searchParams.get('after') ?? NaN)
  let lastId = Number.isFinite(fromHeader) ? fromHeader : Number.isFinite(fromQuery) ? fromQuery : 0
  let lastStatus = ''

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (chunk: string) => { if (!closed) controller.enqueue(encoder.encode(chunk)) }
      const close = () => {
        if (closed) return
        closed = true
        clearInterval(poll); clearInterval(beat); clearTimeout(life)
        try { controller.close() } catch {}
      }

      const tick = async () => {
        try {
          const t = await getTicket(ticketId)
          if (!t) return close()
          const status = JSON.stringify({ status: t.status, assignedTo: t.assigned_name, priority: normPriority(t.priority), rejectedReason: t.rejected_reason })
          if (status !== lastStatus) {
            lastStatus = status
            send(`event: status\ndata: ${status}\n\n`)
          }
          const msgs = (await getMessages(t, lastId)).filter(m => m.id > lastId)
          for (const m of msgs) {
            send(`id: ${m.id}\nevent: message\ndata: ${JSON.stringify(m)}\n\n`)
            lastId = m.id
          }
          if (msgs.length && isOwner) await markPlayerSeen(ticketId, lastId)
        } catch {
          // transient DB error: keep the stream, next tick retries
        }
      }

      send('retry: 3000\n\n')
      await tick()
      const poll = setInterval(tick, POLL_MS)
      const beat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS)
      const life = setTimeout(close, MAX_LIFETIME_MS)
      req.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
