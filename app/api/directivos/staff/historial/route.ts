import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaffAdmin, staffErrorResponse } from '@/lib/staff/actions.server'
import { getActivity } from '@/lib/staff/data.server'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
const schema = z.object({
  q: z.string().trim().max(60).optional(),
  actor: z.string().trim().max(32).optional(),
  action: z.string().regex(/^[A-Z_]{3,40}$/).optional(),
  from: date,
  to: date,
  page: z.coerce.number().int().min(1).max(100000).default(1),
})

/** Historial del staff (solo lectura: la tabla es de solo inserción). */
export async function GET(req: NextRequest) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  const parsed = schema.safeParse(Object.fromEntries([...req.nextUrl.searchParams].filter(([, v]) => v !== '')))
  if (!parsed.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400 })
  try {
    return NextResponse.json(await getActivity(parsed.data))
  } catch (err) {
    return staffErrorResponse(err, 'historial')
  }
}
