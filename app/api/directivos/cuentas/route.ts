import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaffAdmin, staffErrorResponse } from '@/lib/staff/actions.server'
import { listAccounts } from '@/lib/gm/accounts.server'
import { getMembers } from '@/lib/staff/data.server'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
const schema = z.object({
  q: z.string().trim().max(32).optional(),
  country: z.string().regex(/^([A-Za-z]{2}|unknown)$/).optional(),
  from: date,
  to: date,
  status: z.enum(['active', 'banned']).optional(),
  online: z.enum(['online', 'offline']).optional(),
  withCharacters: z.enum(['1']).optional(),
  gm: z.enum(['staff', 'players']).optional(),
  gmlevel: z.coerce.number().int().min(0).max(4).optional(),
  sort: z.enum(['id_desc', 'id_asc', 'last_login', 'username']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(25),
})

/**
 * Todas las cuentas de acore_auth.account (no solo las creadas desde el CMS), con datos
 * completos para Directivos y su situación en el staff (rango, estado, divisiones).
 */
export async function GET(req: NextRequest) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  const parsed = schema.safeParse(Object.fromEntries([...req.nextUrl.searchParams].filter(([, v]) => v !== '')))
  if (!parsed.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400 })
  const f = parsed.data
  try {
    const data = await listAccounts({ ...f, withCharacters: f.withCharacters === '1' }, 3)
    const members = await getMembers(data.accounts.map(a => a.id))
    const byId = new Map(members.map(m => [m.id, m]))
    return NextResponse.json({
      ...data,
      page: f.page,
      pageSize: f.pageSize,
      accounts: data.accounts.map(a => {
        const m = byId.get(a.id)
        return {
          ...a,
          staff: m && m.status !== 'sin_permisos'
            ? { rank: m.rank, status: m.status, divisions: m.divisions.map(d => ({ id: d.id, name: d.name, color: d.color })), directivo: m.directivo }
            : null,
          directivo: m?.directivo ?? null,
        }
      }),
    })
  } catch (err) {
    return staffErrorResponse(err, 'cuentas')
  }
}
