import { NextRequest, NextResponse } from 'next/server'
import { requireGm } from '@/lib/gm/access.server'
import { AUTH_DB, queryCms } from '@/lib/db'
import { TICKET_STATUSES, TICKET_PRIORITIES, normPriority } from '@/lib/tickets.server'
import { actionErrorResponse } from '@/lib/gm/http.server'

/** Support inbox with filters by status, priority, date, GM and text. */
export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'viewTickets')
  if (ctx instanceof Response) return ctx

  const sp = req.nextUrl.searchParams
  const where: string[] = []
  const params: unknown[] = []
  const status = sp.get('status')
  if (status === 'activos') where.push("t.status IN ('Abierto','Aceptado','En Revisión')")
  else if (status && (TICKET_STATUSES as readonly string[]).includes(status)) { where.push('t.status = ?'); params.push(status) }
  const priority = sp.get('priority')
  if (priority && (TICKET_PRIORITIES as readonly string[]).includes(priority)) {
    if (priority === 'Normal') where.push("t.priority IN ('Normal','Media')")
    else { where.push('t.priority = ?'); params.push(priority) }
  }
  const gm = sp.get('gm')
  if (gm === 'me') { where.push('t.assigned_to = ?'); params.push(ctx.user.id) }
  else if (gm === 'none') where.push('t.assigned_to IS NULL')
  else if (gm && /^\d+$/.test(gm)) { where.push('t.assigned_to = ?'); params.push(Number(gm)) }
  const from = sp.get('from'), to = sp.get('to')
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) { where.push('t.created_at >= ?'); params.push(`${from} 00:00:00`) }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) { where.push('t.created_at <= ?'); params.push(`${to} 23:59:59`) }
  const q = sp.get('q')?.trim().slice(0, 60)
  if (q) {
    if (/^\d+$/.test(q)) { where.push('(t.id = ? OR t.subject LIKE ?)'); params.push(Number(q), `%${q}%`) }
    else { where.push('(t.subject LIKE ? OR a.username LIKE ? OR t.character_name LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const [rows, gms, counts] = await Promise.all([
      queryCms<Record<string, unknown>>(
        `SELECT t.id, t.account_id, a.username AS account_name, t.character_name, t.subject, t.category, t.status, t.priority,
                t.assigned_to, ga.username AS assigned_name, t.created_at, t.last_reply_at,
                (SELECT r.author_name FROM cms_ticket_replies r WHERE r.ticket_id = t.id AND r.is_system = 0 ORDER BY r.id DESC LIMIT 1) AS last_author,
                (SELECT r.is_gm FROM cms_ticket_replies r WHERE r.ticket_id = t.id AND r.is_system = 0 ORDER BY r.id DESC LIMIT 1) AS last_is_gm
         FROM cms_tickets t
         LEFT JOIN ${AUTH_DB}.account a ON a.id = t.account_id
         LEFT JOIN ${AUTH_DB}.account ga ON ga.id = t.assigned_to
         ${whereSql}
         ORDER BY FIELD(t.status, 'Abierto', 'Aceptado', 'En Revisión', 'Rechazado', 'Cerrado'),
                  FIELD(t.priority, 'Urgente', 'Alta', 'Normal', 'Media', 'Baja'), t.created_at DESC
         LIMIT 200`,
        params
      ),
      queryCms<{ id: number; username: string }>(
        `SELECT DISTINCT a.id, a.username FROM ${AUTH_DB}.account_access x JOIN ${AUTH_DB}.account a ON a.id = x.id WHERE x.gmlevel > 0 ORDER BY a.username`
      ).catch(() => []),
      queryCms<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM cms_tickets GROUP BY status'),
    ])
    return NextResponse.json({
      me: ctx.user.id,
      tier: ctx.tier,
      gms,
      counts: Object.fromEntries(counts.map(c => [c.status, Number(c.c)])),
      tickets: rows.map(r => ({
        ...r,
        priority: normPriority(r.priority as string),
        waitingPlayer: r.last_is_gm === 1,
      })),
    })
  } catch (err) {
    return actionErrorResponse(err, 'tickets:inbox')
  }
}
