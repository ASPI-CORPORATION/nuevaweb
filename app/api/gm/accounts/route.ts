import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGm } from '@/lib/gm/access.server'
import { listAccounts } from '@/lib/gm/accounts.server'
import { actionErrorResponse } from '@/lib/gm/http.server'

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
  sort: z.enum(['id_desc', 'id_asc', 'last_login', 'username']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
})

/** Every account in acore_auth.account (console, authserver, tools, legacy — not only CMS registrations). */
export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'viewAccounts')
  if (ctx instanceof Response) return ctx

  const raw = Object.fromEntries([...req.nextUrl.searchParams.entries()].filter(([, v]) => v !== ''))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400 })
  const f = parsed.data

  try {
    const data = await listAccounts({ ...f, withCharacters: f.withCharacters === '1' }, ctx.tier)
    return NextResponse.json({ ...data, page: f.page, pageSize: f.pageSize })
  } catch (err) {
    return actionErrorResponse(err, 'accounts:list')
  }
}
