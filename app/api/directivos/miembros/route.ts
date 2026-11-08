import { NextRequest, NextResponse } from 'next/server'
import { requireDirectivo, requireOwner, logDirectivoAction } from '@/lib/directivos'
import { queryAuthFirst, executeCms } from '@/lib/db'
import { listTeam, getTeamRow, addMemberSchema } from '@/lib/directivos-team.server'
import { isOwner } from '@/lib/roles'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

/** Any active Directivo can see the team; `canManage` tells the UI whether the caller is the Propietario. */
export async function GET(req: NextRequest) {
  const me = await requireDirectivo(req)
  if (me instanceof Response) return me
  try {
    const members = await listTeam()
    return NextResponse.json({ members, canManage: isOwner(me.access), me: me.id })
  } catch (err) {
    console.error('[directivos:list]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo cargar el equipo de Directivos.' }, { status: 500 })
  }
}

/** Propietario only: add an existing AzerothCore account as Directivo. Never grants in-game permissions. */
export async function POST(req: NextRequest) {
  const owner = await requireOwner(req)
  if (owner instanceof Response) return owner

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }
  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { accountId, nombre } = parsed.data

  try {
    const account = await queryAuthFirst<{ id: number; username: string }>('SELECT id, username FROM account WHERE id = ?', [accountId])
    if (!account) return NextResponse.json({ error: 'No encontramos una cuenta con el ID indicado.' }, { status: 404 })

    const existing = await getTeamRow(accountId)
    if (existing && !existing.fecha_baja) {
      const msg = existing.activo
        ? `La cuenta ${account.username} ya forma parte del equipo de Directivos.`
        : `La cuenta ${account.username} ya está en el equipo con el acceso desactivado. Activala desde el listado.`
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    if (existing) {
      // Previously removed: reuse the row (account_id is unique); history stays in cms_directivos_logs
      await executeCms(
        `UPDATE wowargentina_directivos
         SET nombre_directivo = ?, rango = 'directivo', activo = 1, protegido = 0, fecha_ingreso = NOW(),
             agregado_por = ?, fecha_baja = NULL, removido_por = NULL
         WHERE account_id = ? AND fecha_baja IS NOT NULL`,
        [nombre, owner.id, accountId]
      )
    } else {
      await executeCms(
        `INSERT INTO wowargentina_directivos (account_id, nombre_directivo, rango, activo, protegido, agregado_por)
         VALUES (?, ?, 'directivo', 1, 0, ?)`,
        [accountId, nombre, owner.id]
      )
    }

    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logDirectivoAction(owner.id, accountId, 'DIRECTIVO_ADD',
      `${owner.username} incorporó a ${account.username} (#${accountId}) al equipo de Directivos como "${nombre}"`, normalizedIp)

    return NextResponse.json({ success: true, member: { accountId, username: account.username, nombre } })
  } catch (err) {
    if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Esa cuenta ya forma parte del equipo de Directivos.' }, { status: 409 })
    }
    console.error('[directivos:add]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo completar la operación. Intentá nuevamente.' }, { status: 500 })
  }
}
