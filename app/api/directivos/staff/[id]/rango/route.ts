import { NextRequest, NextResponse } from 'next/server'
import { parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, changeRank } from '@/lib/staff/actions.server'
import { rankChangeSchema, firstIssue } from '@/lib/staff/schemas'

/** Incorporar al staff, asignar rango, ascender o degradar (escribe account_access y, si existe, RBAC). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  const parsed = rankChangeSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await changeRank(ctx, id, { ...parsed.data, rank: parsed.data.rank as never })) })
  } catch (err) {
    return staffErrorResponse(err, 'rango')
  }
}
