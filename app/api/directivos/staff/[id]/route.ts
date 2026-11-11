import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, capabilities, updateProfile } from '@/lib/staff/actions.server'
import { getStaffFile } from '@/lib/staff/data.server'
import { profileSchema, firstIssue } from '@/lib/staff/schemas'

/** Expediente completo del miembro (datos reales; lo que no tiene registros se informa como tal). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  try {
    const file = await getStaffFile(id)
    if (!file) return NextResponse.json({ error: 'No existe una cuenta con ese ID en acore_auth.account.' }, { status: 404 })
    return NextResponse.json({ ...file, can: capabilities(ctx, file.member), viewer: { id: ctx.user.id, username: ctx.user.username, isOwner: ctx.isOwner } })
  } catch (err) {
    return staffErrorResponse(err, 'expediente')
  }
}

/** Editar fecha de ingreso u observaciones internas del expediente. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = profileSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await updateProfile(ctx, id, parsed.data)) })
  } catch (err) {
    return staffErrorResponse(err, 'expediente-editar')
  }
}
