import { z } from 'zod'
import { AUTH_DB, queryCms, queryCmsFirst, executeCms } from '@/lib/db'
import { ActionError } from '@/lib/gm/actions.server'
import { type GmContext, gmLog } from '@/lib/gm/access.server'
import { can } from '@/lib/gm/permissions'

export const TICKET_STATUSES = ['Abierto', 'Aceptado', 'En Revisión', 'Rechazado', 'Cerrado'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]
export const TICKET_PRIORITIES = ['Baja', 'Normal', 'Alta', 'Urgente'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]
const FINAL: TicketStatus[] = ['Cerrado', 'Rechazado']

export const normPriority = (p: string | null | undefined): TicketPriority =>
  p === 'Media' || !p ? 'Normal' : (TICKET_PRIORITIES as readonly string[]).includes(p) ? (p as TicketPriority) : 'Normal'

export interface TicketRow {
  id: number; account_id: number; account_name: string | null; character_name: string | null; category: string
  subject: string; message: string; status: TicketStatus; priority: string; assigned_to: number | null
  assigned_name: string | null; created_at: Date; updated_at: Date; closed_at: Date | null; rejected_reason: string | null
  last_reply_at: Date | null
}

export async function getTicket(id: number): Promise<TicketRow | null> {
  return queryCmsFirst<TicketRow>(
    `SELECT t.id, t.account_id, a.username AS account_name, t.character_name, t.category, t.subject, t.message,
            t.status, t.priority, t.assigned_to, ga.username AS assigned_name, t.created_at, t.updated_at,
            t.closed_at, t.rejected_reason, t.last_reply_at
     FROM cms_tickets t
     LEFT JOIN ${AUTH_DB}.account a ON a.id = t.account_id
     LEFT JOIN ${AUTH_DB}.account ga ON ga.id = t.assigned_to
     WHERE t.id = ?`,
    [id]
  )
}

export interface TicketMessage {
  id: number; kind: 'player' | 'gm' | 'system'; author: string; body: string; createdAt: string
}

/** Message 0 is the ticket's opening message; replies follow with their real ids (stable for SSE). */
export async function getMessages(ticket: TicketRow, afterId = -1): Promise<TicketMessage[]> {
  const rows = await queryCms<{ id: number; author_name: string | null; is_gm: number; is_system: number; message: string; created_at: Date }>(
    'SELECT id, author_name, is_gm, is_system, message, created_at FROM cms_ticket_replies WHERE ticket_id = ? AND id > ? ORDER BY id',
    [ticket.id, Math.max(afterId, 0)]
  )
  const out: TicketMessage[] = []
  if (afterId < 0) {
    out.push({ id: 0, kind: 'player', author: ticket.account_name ?? 'Jugador', body: ticket.message, createdAt: new Date(ticket.created_at).toISOString() })
  }
  for (const r of rows) {
    out.push({
      id: r.id,
      kind: r.is_system ? 'system' : r.is_gm ? 'gm' : 'player',
      author: r.is_system ? 'Sistema' : r.author_name ?? (r.is_gm ? 'GM' : 'Jugador'),
      body: r.message,
      createdAt: new Date(r.created_at).toISOString(),
    })
  }
  return out
}

async function insertReply(ticketId: number, authorId: number, authorName: string, kind: 'player' | 'gm' | 'system', message: string) {
  const r = await executeCms(
    'INSERT INTO cms_ticket_replies (ticket_id, author_id, author_name, is_gm, is_system, message) VALUES (?, ?, ?, ?, ?, ?)',
    [ticketId, authorId, authorName, kind === 'gm' ? 1 : 0, kind === 'system' ? 1 : 0, message]
  )
  await executeCms('UPDATE cms_tickets SET last_reply_at = NOW() WHERE id = ?', [ticketId])
  return r.insertId
}

export function cleanMessage(raw: string, max = 4000): string {
  return raw.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max)
}

// ── Player side ─────────────────────────────────────────────────────────────

export async function playerReply(accountId: number, username: string, ticketId: number, raw: string) {
  const t = await getTicket(ticketId)
  if (!t || t.account_id !== accountId) throw new ActionError('Ticket no encontrado.', 404)
  if (FINAL.includes(t.status)) throw new ActionError('Este ticket está cerrado. Si necesitás más ayuda, creá una nueva solicitud.', 409)
  const body = cleanMessage(raw)
  if (body.length < 2) throw new ActionError('Escribí un mensaje.')
  const id = await insertReply(ticketId, accountId, username, 'player', body)
  await markPlayerSeen(ticketId, id)
  return id
}

export async function markPlayerSeen(ticketId: number, upToId?: number) {
  await executeCms(
    `UPDATE cms_tickets SET player_seen_reply_id = GREATEST(player_seen_reply_id,
       COALESCE(?, (SELECT COALESCE(MAX(id), 0) FROM cms_ticket_replies WHERE ticket_id = ?)))
     WHERE id = ?`,
    [upToId ?? null, ticketId, ticketId]
  ).catch(() => {})
}

// ── GM side ─────────────────────────────────────────────────────────────────

export type GmTicketAction =
  | { action: 'accept' }
  | { action: 'review' }
  | { action: 'reply'; message: string }
  | { action: 'reject'; reason: string }
  | { action: 'close'; message?: string }
  | { action: 'reopen' }
  | { action: 'priority'; priority: TicketPriority }
  | { action: 'reassign'; gmAccountId: number | null }

async function systemNote(ticketId: number, text: string) {
  await insertReply(ticketId, 0, 'Sistema', 'system', text)
}

export async function gmTicketAction(ctx: GmContext, ticketId: number, a: GmTicketAction) {
  const t = await getTicket(ticketId)
  if (!t) throw new ActionError('Ticket no encontrado.', 404)
  if (t.account_id === ctx.user.id) throw new ActionError('No podés atender tus propios tickets.', 403)
  const me = ctx.user.username
  const assignedToOther = t.assigned_to != null && t.assigned_to !== ctx.user.id
  const supervisor = can(ctx.tier, 'reassignTickets')
  const log = (action: string, details: string) =>
    gmLog(ctx, { action, targetAccountId: t.account_id, result: 'ok', reference: `ticket#${ticketId}`, details })

  if (a.action === 'accept') {
    if (FINAL.includes(t.status)) throw new ActionError('El ticket está cerrado. Reabrilo primero.', 409)
    // Atomic claim: only succeeds if nobody else holds it
    const r = await executeCms(
      `UPDATE cms_tickets SET assigned_to = ?, assigned_at = NOW(),
              status = IF(status = 'Abierto', 'Aceptado', status)
       WHERE id = ? AND (assigned_to IS NULL OR assigned_to = ?) AND status NOT IN ('Cerrado','Rechazado')`,
      [ctx.user.id, ticketId, ctx.user.id]
    )
    if (r.affectedRows === 0) {
      const now = await getTicket(ticketId)
      throw new ActionError(`El ticket #${ticketId} ya fue tomado por ${now?.assigned_name ?? 'otro GM'}.`, 409)
    }
    if (t.assigned_to !== ctx.user.id) {
      await systemNote(ticketId, `El GM ${me} tomó el ticket.`)
      await log('TICKET_ACEPTAR', `Ticket #${ticketId} asignado a ${me}`)
    }
    return { message: `Te asignaste correctamente el ticket #${ticketId}.` }
  }

  if (a.action === 'reassign') {
    if (!supervisor) throw new ActionError('Solo un GM nivel 3 puede reasignar tickets.', 403)
    let name: string | null = null
    if (a.gmAccountId) {
      const g = await queryCmsFirst<{ username: string; gmlevel: number }>(
        `SELECT a.username, MAX(x.gmlevel) AS gmlevel FROM ${AUTH_DB}.account a JOIN ${AUTH_DB}.account_access x ON x.id = a.id WHERE a.id = ? GROUP BY a.username`,
        [a.gmAccountId]
      )
      if (!g || g.gmlevel < 1) throw new ActionError('La cuenta indicada no es un GM.', 400)
      name = g.username
    }
    await executeCms('UPDATE cms_tickets SET assigned_to = ?, assigned_at = IF(? IS NULL, NULL, NOW()) WHERE id = ?', [a.gmAccountId, a.gmAccountId, ticketId])
    await systemNote(ticketId, name ? `El ticket fue reasignado a ${name}.` : 'El ticket quedó sin GM asignado.')
    await log('TICKET_REASIGNAR', `Ticket #${ticketId} → ${name ?? 'sin asignar'}`)
    return { message: name ? `Ticket #${ticketId} reasignado a ${name}.` : `Ticket #${ticketId} liberado.` }
  }

  // Every other action works on a ticket you hold (GM 3 may supervise any ticket)
  if (assignedToOther && !supervisor) {
    throw new ActionError(`El ticket #${ticketId} está asignado a ${t.assigned_name}. Solo un GM nivel 3 puede intervenir.`, 409)
  }
  const claimIfFree = async () => {
    if (t.assigned_to == null) {
      await executeCms('UPDATE cms_tickets SET assigned_to = ?, assigned_at = NOW() WHERE id = ? AND assigned_to IS NULL', [ctx.user.id, ticketId])
    }
  }

  switch (a.action) {
    case 'review': {
      if (FINAL.includes(t.status)) throw new ActionError('El ticket está cerrado. Reabrilo primero.', 409)
      await claimIfFree()
      await executeCms("UPDATE cms_tickets SET status = 'En Revisión' WHERE id = ?", [ticketId])
      await systemNote(ticketId, `El GM ${me} marcó el ticket En revisión.`)
      await log('TICKET_REVISION', `Ticket #${ticketId} en revisión`)
      return { message: `El ticket #${ticketId} quedó En revisión.` }
    }
    case 'reply': {
      if (FINAL.includes(t.status)) throw new ActionError('El ticket está cerrado. Reabrilo para responder.', 409)
      const body = cleanMessage(a.message)
      if (body.length < 2) throw new ActionError('Escribí un mensaje.')
      await claimIfFree()
      await executeCms("UPDATE cms_tickets SET status = IF(status = 'Abierto', 'Aceptado', status) WHERE id = ?", [ticketId])
      const id = await insertReply(ticketId, ctx.user.id, me, 'gm', body)
      await log('TICKET_RESPONDER', `Respuesta en ticket #${ticketId}`)
      return { message: 'Respuesta enviada. El jugador la verá al instante.', replyId: id }
    }
    case 'reject': {
      if (FINAL.includes(t.status)) throw new ActionError('El ticket ya está cerrado.', 409)
      const reason = cleanMessage(a.reason, 500)
      if (reason.length < 5) throw new ActionError('Indicá el motivo del rechazo (mínimo 5 caracteres).')
      await claimIfFree()
      await executeCms("UPDATE cms_tickets SET status = 'Rechazado', rejected_reason = ?, closed_at = NOW(), closed_by = ? WHERE id = ?", [reason, ctx.user.id, ticketId])
      await insertReply(ticketId, ctx.user.id, me, 'gm', `Solicitud rechazada. Motivo: ${reason}`)
      await systemNote(ticketId, `El GM ${me} rechazó el ticket.`)
      await gmLog(ctx, { action: 'TICKET_RECHAZAR', targetAccountId: t.account_id, reason, result: 'ok', reference: `ticket#${ticketId}`, details: `Ticket #${ticketId} rechazado` })
      return { message: `El ticket #${ticketId} fue rechazado y el usuario ha sido notificado.` }
    }
    case 'close': {
      if (FINAL.includes(t.status)) throw new ActionError('El ticket ya está cerrado.', 409)
      await claimIfFree()
      const body = a.message ? cleanMessage(a.message) : ''
      if (body.length >= 2) await insertReply(ticketId, ctx.user.id, me, 'gm', body)
      await executeCms("UPDATE cms_tickets SET status = 'Cerrado', closed_at = NOW(), closed_by = ? WHERE id = ?", [ctx.user.id, ticketId])
      await systemNote(ticketId, `El GM ${me} cerró el ticket.`)
      await log('TICKET_CERRAR', `Ticket #${ticketId} cerrado`)
      return { message: 'El ticket fue cerrado y el usuario ha sido notificado.' }
    }
    case 'reopen': {
      if (!FINAL.includes(t.status)) throw new ActionError('El ticket no está cerrado.', 409)
      await executeCms(
        "UPDATE cms_tickets SET status = IF(assigned_to IS NULL, 'Abierto', 'Aceptado'), closed_at = NULL, closed_by = NULL, rejected_reason = NULL WHERE id = ?",
        [ticketId]
      )
      await systemNote(ticketId, `El GM ${me} reabrió el ticket.`)
      await log('TICKET_REABRIR', `Ticket #${ticketId} reabierto`)
      return { message: `El ticket #${ticketId} fue reabierto.` }
    }
    case 'priority': {
      await executeCms('UPDATE cms_tickets SET priority = ? WHERE id = ?', [a.priority, ticketId])
      await systemNote(ticketId, `Prioridad cambiada a ${a.priority}.`)
      await log('TICKET_PRIORIDAD', `Ticket #${ticketId} → ${a.priority}`)
      return { message: `Prioridad actualizada a ${a.priority}.` }
    }
  }
}

export function fillTemplate(body: string, vars: { gm: string; player: string; ticketId: number }) {
  return body
    .replace(/\{gm\.username\}/g, vars.gm)
    .replace(/\{player\.username\}/g, vars.player)
    .replace(/\{ticket\.id\}/g, String(vars.ticketId))
}

export const templateSchema = z.object({
  label: z.string().trim().min(2).max(40),
  body: z.string().trim().min(5).max(2000),
  sortOrder: z.number().int().min(0).max(999).optional(),
})
