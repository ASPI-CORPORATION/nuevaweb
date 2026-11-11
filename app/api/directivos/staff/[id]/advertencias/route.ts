import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, issueWarning } from '@/lib/staff/actions.server'
import { warningSchema, firstIssue } from '@/lib/staff/schemas'

/** Emitir advertencia (nunca suspende automáticamente). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = warningSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await issueWarning(ctx, id, parsed.data)) })
  } catch (err) {
    return staffErrorResponse(err, 'advertir')
  }
}
