import { NextRequest, NextResponse } from 'next/server'
import { requireGm, gmLog } from '@/lib/gm/access.server'
import { executeCms } from '@/lib/db'
import { actionErrorResponse, parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { templateSchema } from '@/lib/tickets.server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await requireGm(req, 'manageTemplates')
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'Plantilla inválida.' }, { status: 400 })
  const parsed = templateSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  try {
    const r = await executeCms(
      'UPDATE cms_gm_reply_templates SET label = ?, body = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [parsed.data.label, parsed.data.body, parsed.data.sortOrder ?? null, id]
    )
    if (!r.affectedRows) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })
    await gmLog(ctx, { action: 'PLANTILLA_EDITAR', result: 'ok', reference: `plantilla#${id}`, details: `Plantilla "${parsed.data.label}" editada` })
    return NextResponse.json({ success: true })
  } catch (err) {
    return actionErrorResponse(err, 'templates:update')
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const ctx = await requireGm(req, 'manageTemplates')
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'Plantilla inválida.' }, { status: 400 })
  try {
    const r = await executeCms('DELETE FROM cms_gm_reply_templates WHERE id = ?', [id])
    if (!r.affectedRows) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })
    await gmLog(ctx, { action: 'PLANTILLA_ELIMINAR', result: 'ok', reference: `plantilla#${id}`, details: `Plantilla #${id} eliminada` })
    return NextResponse.json({ success: true })
  } catch (err) {
    return actionErrorResponse(err, 'templates:delete')
  }
}
