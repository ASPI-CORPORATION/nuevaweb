import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, updateDivision } from '@/lib/staff/actions.server'
import { getDivision } from '@/lib/staff/data.server'
import { divisionUpdateSchema, firstIssue } from '@/lib/staff/schemas'

/** Editar, desactivar o reactivar una división. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = divisionUpdateSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await updateDivision(ctx, id, parsed.data)) })
  } catch (err) {
    return staffErrorResponse(err, 'division-editar')
  }
}

/** División con miembros activos e historial completo de asignaciones. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  try {
    const division = await getDivision(id)
    if (!division) return NextResponse.json({ error: 'La división no existe.' }, { status: 404 })
    return NextResponse.json({ division })
  } catch (err) {
    return staffErrorResponse(err, 'division')
  }
}
