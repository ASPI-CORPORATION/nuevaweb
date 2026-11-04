import { NextRequest, NextResponse } from 'next/server'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 2)
  if (result instanceof Response) return result

  const tickets = await queryCms(
    `SELECT t.id, t.account_id, t.character_name, t.category, t.subject, t.message,
            t.status, t.priority, t.created_at, t.updated_at,
            a.username as account_name
     FROM cms_tickets t
     LEFT JOIN acore_auth.account a ON t.account_id = a.id
     ORDER BY
       CASE t.priority WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END,
       t.created_at DESC
     LIMIT 100`
  )

  return NextResponse.json({ tickets })
}

export async function PATCH(req: NextRequest) {
  const result = await requireGmLevel(req, 2)
  if (result instanceof Response) return result
  const gm = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { ticketId, action, message, status } = body as Record<string, unknown>
  if (!ticketId) return NextResponse.json({ error: 'ticketId requerido' }, { status: 400 })

  if (action === 'reply' && message) {
    await queryCms(
      'INSERT INTO cms_ticket_replies (ticket_id, author_id, author_name, is_gm, message) VALUES (?, ?, ?, 1, ?)',
      [ticketId, gm.id, gm.username, message]
    )
    await queryCms(
      "UPDATE cms_tickets SET status = 'En Revisión', assigned_to = ? WHERE id = ?",
      [gm.id, ticketId]
    )
  } else if (action === 'status' && status) {
    await queryCms('UPDATE cms_tickets SET status = ? WHERE id = ?', [status, ticketId])
  }

  return NextResponse.json({ success: true })
}
