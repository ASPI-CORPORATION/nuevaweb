import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOwner, logDirectivoAction } from '@/lib/directivos'
import { queryAuthFirst, executeCms } from '@/lib/db'
import { getTeamRow, isProtectedMember, parseAccountIdParam } from '@/lib/directivos-team.server'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

type Ctx = { params: Promise<{ accountId: string }> }

async function loadTarget(raw: string, callerId: number) {
  const accountId = parseAccountIdParam(raw)
  if (!accountId) return { error: NextResponse.json({ error: 'ID de cuenta inválido.' }, { status: 400 }) }
  const row = await getTeamRow(accountId)
  if (!row || row.fecha_baja) {
    return { error: NextResponse.json({ error: 'Esa cuenta no forma parte del equipo de Directivos.' }, { status: 404 }) }
  }
  if (isProtectedMember(row)) {
    return { error: NextResponse.json({ error: 'El Propietario está protegido y no puede modificarse desde el panel.' }, { status: 403 }) }
  }
  if (accountId === callerId) {
    return { error: NextResponse.json({ error: 'No podés modificar tu propio acceso.' }, { status: 403 }) }
  }
  const account = await queryAuthFirst<{ username: string }>('SELECT username FROM account WHERE id = ?', [accountId])
  return { accountId, row, username: account?.username ?? `#${accountId}` }
}

const patchSchema = z.object({ activo: z.boolean({ message: 'Indicá si el acceso queda activo o no.' }) })

/** Propietario only: enable / disable a Directivo's access without removing them from the team. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const owner = await requireOwner(req)
  if (owner instanceof Response) return owner

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const t = await loadTarget((await params).accountId, owner.id)
    if ('error' in t) return t.error
    await executeCms('UPDATE wowargentina_directivos SET activo = ? WHERE account_id = ? AND fecha_baja IS NULL', [parsed.data.activo ? 1 : 0, t.accountId])
    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logDirectivoAction(owner.id, t.accountId, parsed.data.activo ? 'DIRECTIVO_ENABLE' : 'DIRECTIVO_DISABLE',
      `${owner.username} ${parsed.data.activo ? 'activó' : 'desactivó'} el acceso de ${t.username} (#${t.accountId})`, normalizedIp)
    return NextResponse.json({ success: true, activo: parsed.data.activo, username: t.username })
  } catch (err) {
    console.error('[directivos:toggle]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo completar la operación. Intentá nuevamente.' }, { status: 500 })
  }
}

/** Propietario only: remove from the team. Logical delete — the row and the audit log are kept. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const owner = await requireOwner(req)
  if (owner instanceof Response) return owner

  try {
    const t = await loadTarget((await params).accountId, owner.id)
    if ('error' in t) return t.error
    await executeCms(
      'UPDATE wowargentina_directivos SET activo = 0, fecha_baja = NOW(), removido_por = ? WHERE account_id = ? AND fecha_baja IS NULL',
      [owner.id, t.accountId]
    )
    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logDirectivoAction(owner.id, t.accountId, 'DIRECTIVO_REMOVE',
      `${owner.username} eliminó a ${t.username} (#${t.accountId}) del equipo de Directivos ("${t.row.nombre_directivo}")`, normalizedIp)
    return NextResponse.json({ success: true, username: t.username })
  } catch (err) {
    console.error('[directivos:remove]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo completar la operación. Intentá nuevamente.' }, { status: 500 })
  }
}
