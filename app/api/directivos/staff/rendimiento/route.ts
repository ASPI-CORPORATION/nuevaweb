import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaffAdmin, staffErrorResponse } from '@/lib/staff/actions.server'
import { getPerformance } from '@/lib/staff/data.server'
import { RANK_KEYS, type RankKey } from '@/lib/staff/ranks'

const schema = z.object({
  period: z.enum(['day', 'week', 'month']).default('week'),
  division: z.coerce.number().int().positive().optional(),
  member: z.coerce.number().int().positive().optional(),
  rank: z.enum(RANK_KEYS as [string, ...string[]]).optional(),
})

/** Métricas reales del CMS como apoyo a la supervisión (sin rankings ni sanciones automáticas). */
export async function GET(req: NextRequest) {
  const ctx = await requireStaffAdmin(req)
  if (ctx instanceof Response) return ctx
  const parsed = schema.safeParse(Object.fromEntries([...req.nextUrl.searchParams].filter(([, v]) => v !== '')))
  if (!parsed.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400 })
  try {
    return NextResponse.json(await getPerformance({ ...parsed.data, rank: parsed.data.rank as RankKey | undefined }))
  } catch (err) {
    return staffErrorResponse(err, 'rendimiento')
  }
}
