import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, updateWarning } from '@/lib/staff/actions.server'
import { warningStatusSchema, firstIssue } from '@/lib/staff/schemas'

/** Marcar una advertencia como revisada, apelada, anulada o vigente (con trazabilidad). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ wid: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).wid)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = warningStatusSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await updateWarning(ctx, id, parsed.data)) })
  } catch (err) {
    return staffErrorResponse(err, 'advertencia-estado')
  }
}
