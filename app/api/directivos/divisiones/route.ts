import { NextRequest, NextResponse } from 'next/server'
import { readJson } from '@/lib/gm/http.server'
import { requireStaffAdmin, staffErrorResponse, createDivision } from '@/lib/staff/actions.server'
import { listDivisions } from '@/lib/staff/data.server'
import { divisionCreateSchema, firstIssue } from '@/lib/staff/schemas'

/** Divisiones internas (administrativas: no otorgan RBAC, acceso a Directivos ni comandos). */
export async function GET(req: NextRequest) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  try {
    return NextResponse.json({ divisions: await listDivisions() })
  } catch (err) {
    return staffErrorResponse(err, 'divisiones')
  }
}

export async function POST(req: NextRequest) {
  const ctx = await requireStaffAdmin(req, true)
  if (ctx instanceof Response) return ctx
  const parsed = divisionCreateSchema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  try {
    return NextResponse.json({ success: true, ...(await createDivision(ctx, parsed.data)) })
  } catch (err) {
    return staffErrorResponse(err, 'division-crear')
  }
}
