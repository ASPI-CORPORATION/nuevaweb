import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, liftSuspension, restorePermissions } from '@/lib/staff/actions.server'
import { suspensionActionSchema, firstIssue } from '@/lib/staff/schemas'

/** lift: termina la suspensión. restore: re-aplica los permisos previos tras verificar la cuenta (nunca automático). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ sid: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).sid)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = suspensionActionSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    const r = parsed.data.action === 'lift'
      ? await liftSuspension(ctx, id, parsed.data)
      : await restorePermissions(ctx, id, parsed.data)
    return NextResponse.json({ success: true, ...r })
  } catch (err) {
    return staffErrorResponse(err, `suspension-${parsed.data.action}`)
  }
}
