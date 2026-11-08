import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { queryAuth, queryAuthFirst, executeAuth } from '@/lib/db'
import { getAccountAccess } from '@/lib/auth'
import { isOwner } from '@/lib/roles'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

const setGmSchema = z.object({
  accountId: z.number().int().positive(),
  // Native AzerothCore levels only; web Directivo access is managed in wowargentina_directivos
  gmlevel: z.number().int().min(0).max(3),
  reason: z.string().min(1).max(200),
})

/**
 * GET /api/directivos/staff
 * Returns all accounts that have gmlevel > 0 OR a custom RBAC rank (90000–90009),
 * ordered by RBAC rank desc, then gmlevel desc.
 */
export async function GET(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const staff = await queryAuth<{
    id: number
    username: string
    email: string
    online: number
    gmlevel: number
    rbac_rank_id: number | null
  }>(
    `SELECT
       a.id,
       a.username,
       a.email,
       a.online,
       COALESCE(aa.gmlevel, 0)                               AS gmlevel,
       (
         SELECT MAX(r.permission)
         FROM   rbac_account_permissions r
         WHERE  r.id = a.id
           AND  r.permission BETWEEN 90000 AND 90009
           AND  r.granted   = 1
           AND  r.realm_id  = -1
       )                                                      AS rbac_rank_id
     FROM  account a
     LEFT  JOIN account_access aa
           ON  aa.id = a.id AND (aa.RealmID = -1 OR aa.RealmID = 1)
     WHERE aa.gmlevel > 0
        OR EXISTS (
             SELECT 1
             FROM   rbac_account_permissions r2
             WHERE  r2.id = a.id
               AND  r2.permission BETWEEN 90000 AND 90009
               AND  r2.granted  = 1
               AND  r2.realm_id = -1
           )
     ORDER BY
       COALESCE((
         SELECT MAX(r3.permission)
         FROM   rbac_account_permissions r3
         WHERE  r3.id = a.id
           AND  r3.permission BETWEEN 90000 AND 90009
           AND  r3.granted  = 1
           AND  r3.realm_id = -1
       ), 0) DESC,
       COALESCE(aa.gmlevel, 0) DESC,
       a.username ASC`
  ).catch(() => [])

  return NextResponse.json({ staff })
}

/**
 * POST /api/directivos/staff
 * Updates the standard GM level (account_access.gmlevel) for a staff member.
 * Does NOT touch RBAC custom ranks — use /api/directivos/staff/rbac for that.
 */
export async function POST(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  const directivo = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = setGmSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { accountId, gmlevel, reason } = parsed.data
  const ip = normalizeIP(getClientIP(req.headers)).normalizedIp

  const target = await queryAuthFirst<{ id: number; username: string }>(
    'SELECT id, username FROM account WHERE id = ?',
    [accountId]
  )
  if (!target) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  if (accountId === directivo.id) {
    return NextResponse.json(
      { error: 'No podés modificar tu propio nivel de GM (evita perder el acceso al panel).' },
      { status: 403 }
    )
  }

  // Directivo membership comes from wowargentina_directivos: only the Propietario may touch
  // another Directivo's in-game level, and nobody may touch the Propietario's.
  const targetAccess = await getAccountAccess(accountId)
  if (targetAccess.directivo?.rank === 'propietario') {
    return NextResponse.json({ error: 'El nivel del Propietario no puede modificarse desde el panel.' }, { status: 403 })
  }
  if (targetAccess.directivo && !isOwner(directivo.access)) {
    return NextResponse.json({ error: 'Solo el Propietario puede modificar a otros Directivos.' }, { status: 403 })
  }

  if (gmlevel === 0) {
    await executeAuth('DELETE FROM account_access WHERE id = ?', [accountId])
  } else {
    await executeAuth(
      'INSERT INTO account_access (id, gmlevel, RealmID) VALUES (?, ?, -1) ON DUPLICATE KEY UPDATE gmlevel = ?',
      [accountId, gmlevel, gmlevel]
    )
  }

  await logDirectivoAction(
    directivo.id,
    accountId,
    'SET_STAFF_GMLEVEL',
    `${directivo.username} cambió gmlevel de ${target.username} a ${gmlevel}. Motivo: ${reason}`,
    ip
  )

  return NextResponse.json({ success: true })
}
