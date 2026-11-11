import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, updateMembership } from '@/lib/staff/actions.server'
import { membershipSchema, firstIssue } from '@/lib/staff/schemas'

/** Cambiar el cargo dentro de la división o quitar al miembro (la asignación queda en el historial). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; accountId: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const p = await params
  const divisionId = parsePositiveInt(p.id)
  const accountId = parsePositiveInt(p.accountId)
  if (!divisionId || !accountId) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = membershipSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await updateMembership(ctx, divisionId, accountId, parsed.data)) })
  } catch (err) {
    return staffErrorResponse(err, 'division-miembro')
  }
}
