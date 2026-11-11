import { NextRequest, NextResponse } from 'next/server'
import { requireStaffAdmin, capabilities } from '@/lib/staff/actions.server'
import { listStaff, StaffDataError } from '@/lib/staff/data.server'
import { sqlError } from '@/lib/staff/rbac-schema.server'

/**
 * GET /api/directivos/staff
 * Every account with an effective staff level read from AzerothCore (account_access for this
 * realm + RBAC custom ranks when the server really has them), plus former members.
 * A database error is returned as an error — never as an empty staff list.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  try {
    const data = await listStaff()
    return NextResponse.json({
      ...data,
      members: data.members.map(m => ({ ...m, can: capabilities(ctx, m) })),
      former: data.former.map(m => ({ ...m, can: capabilities(ctx, m) })),
      viewer: { id: ctx.user.id, username: ctx.user.username, isOwner: ctx.isOwner },
    })
  } catch (err) {
    const message = err instanceof StaffDataError ? err.message : `Error al consultar el staff: ${sqlError(err)}`
    console.error('[staff:list]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
