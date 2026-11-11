import { NextRequest, NextResponse } from 'next/server'
import { requireGm, gmLog } from '@/lib/gm/access.server'
import { queryCms, executeCms } from '@/lib/db'
import { getTicket, fillTemplate, templateSchema } from '@/lib/tickets.server'
import { actionErrorResponse, readJson } from '@/lib/gm/http.server'

/**
 * Quick replies. With ?ticket=ID the bodies come filled ({gm.username}, {player.username},
 * {ticket.id}) so the GM reviews the final text in the box before sending.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'replyTickets')
  if (ctx instanceof Response) return ctx
  try {
    const rows = await queryCms<{ id: number; label: string; body: string; sort_order: number }>(
      'SELECT id, label, body, sort_order FROM cms_gm_reply_templates ORDER BY sort_order, id'
    )
    const ticketId = Number(req.nextUrl.searchParams.get('ticket') || 0)
    const t = ticketId ? await getTicket(ticketId) : null
    return NextResponse.json({
      canManage: ctx.tier >= 3,
      templates: rows.map(r => ({
        ...r,
        filled: fillTemplate(r.body, { gm: ctx.user.username, player: t?.account_name ?? 'jugador', ticketId: t?.id ?? 0 }),
      })),
    })
  } catch (err) {
    return actionErrorResponse(err, 'templates:list')
  }
}

export async function POST(req: NextRequest) {
  const ctx = await requireGm(req, 'manageTemplates')
  if (ctx instanceof Response) return ctx
  const parsed = templateSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  try {
    const r = await executeCms(
      'INSERT INTO cms_gm_reply_templates (label, body, sort_order, created_by) VALUES (?, ?, ?, ?)',
      [parsed.data.label, parsed.data.body, parsed.data.sortOrder ?? 100, ctx.user.id]
    )
    await gmLog(ctx, { action: 'PLANTILLA_CREAR', result: 'ok', reference: `plantilla#${r.insertId}`, details: `Plantilla "${parsed.data.label}" creada` })
    return NextResponse.json({ success: true, id: r.insertId })
  } catch (err) {
    return actionErrorResponse(err, 'templates:create')
  }
}
