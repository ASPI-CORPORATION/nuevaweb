import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { queryAuth, queryAuthFirst } from '@/lib/db'
import { queryCms } from '@/lib/db'

const schema = z.object({
  accountId: z.number().int().positive(),
  gmlevel: z.number().int().min(0).max(10),
  reason: z.string().min(1).max(200),
})

export async function GET(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const staff = await queryAuth<{ id: number; username: string; email: string; gmlevel: number }>(
    `SELECT a.id, a.username, a.email, COALESCE(aa.gmlevel, 0) as gmlevel
     FROM account a
     LEFT JOIN account_access aa ON a.id = aa.id AND (aa.RealmID = -1 OR aa.RealmID = 1)
     WHERE aa.gmlevel > 0
     ORDER BY aa.gmlevel DESC, a.username ASC`
  )

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  const directivo = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { accountId, gmlevel, reason } = parsed.data
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  const target = await queryAuthFirst<{ id: number; username: string }>(
    'SELECT id, username FROM account WHERE id = ?',
    [accountId]
  )
  if (!target) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  if (gmlevel === 0) {
    await queryAuth('DELETE FROM account_access WHERE id = ?', [accountId])
  } else {
    await queryAuth(
      'INSERT INTO account_access (id, gmlevel, RealmID) VALUES (?, ?, -1) ON DUPLICATE KEY UPDATE gmlevel = ?',
      [accountId, gmlevel, gmlevel]
    )
  }

  await logDirectivoAction(
    directivo.id,
    accountId,
    'SET_STAFF_GMLEVEL',
    `Directivo ${directivo.username} cambió gmlevel de ${target.username} a ${gmlevel}. Motivo: ${reason}`,
    ip
  )

  return NextResponse.json({ success: true })
}
