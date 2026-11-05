/**
 * /api/directivos/staff/rbac
 *
 * GET  ?search=<username|id>        — search any account with their RBAC rank
 * GET  ?history=1&limit=20          — recent RBAC change log entries
 * POST { accountId, rankId|null, reason } — assign/change/remove custom RBAC rank
 *
 * AzerothCore RBAC cache note:
 *   rbac_account_permissions is loaded at session start. Changes here apply
 *   the next time the target account logs in; active sessions are NOT updated.
 *   There is no SOAP command to hot-reload RBAC for a single account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { queryAuth, queryAuthFirst, queryCms, withAuthTransaction } from '@/lib/db'
import { RBAC_MIN, RBAC_MAX, getRank, canAssignRank } from '@/lib/rbac'
import { getAccountRbacRank, countOwners } from '@/lib/rbac.server'

// ─── Schema ──────────────────────────────────────────────────────────────────

const assignSchema = z.object({
  accountId: z.number().int().positive(),
  rankId:    z.number().int().min(RBAC_MIN).max(RBAC_MAX).nullable(),
  reason:    z.string().min(1).max(300),
})

// ─── Shared account lookup query ─────────────────────────────────────────────

function accountWithRbacSql(where: string) {
  return `
    SELECT
      a.id,
      a.username,
      a.email,
      a.online,
      COALESCE(aa.gmlevel, 0) AS gmlevel,
      (
        SELECT MAX(r.permission)
        FROM   rbac_account_permissions r
        WHERE  r.id = a.id
          AND  r.permission BETWEEN ${RBAC_MIN} AND ${RBAC_MAX}
          AND  r.granted  = 1
          AND  r.realm_id = -1
      ) AS rbac_rank_id
    FROM  account a
    LEFT  JOIN account_access aa
          ON aa.id = a.id AND (aa.RealmID = -1 OR aa.RealmID = 1)
    WHERE ${where}
    LIMIT 15
  `
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const { searchParams } = req.nextUrl
  const search  = searchParams.get('search')?.trim() ?? ''
  const history = searchParams.get('history') === '1'
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)

  // ── History mode ────────────────────────────────────────────────────────────
  if (history) {
    const logs = await queryCms<{
      id: number; action: string; details: string; created_at: string
      directivo_name: string | null; target_name: string | null; ip: string
    }>(
      `SELECT l.id, l.action, l.details, l.ip,
              DATE_FORMAT(l.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
              a.username  AS directivo_name,
              t.username  AS target_name
       FROM   cms_directivos_logs l
       LEFT   JOIN acore_auth.account a ON l.directivo_account_id = a.id
       LEFT   JOIN acore_auth.account t ON l.target_account_id    = t.id
       WHERE  l.action IN ('ASSIGN_RBAC_RANK','REMOVE_RBAC_RANK','CHANGE_RBAC_RANK')
       ORDER  BY l.created_at DESC
       LIMIT  ?`,
      [limit]
    ).catch(() => [])

    return NextResponse.json({ logs })
  }

  // ── Search mode ─────────────────────────────────────────────────────────────
  if (search) {
    const isId = /^\d+$/.test(search)
    const accounts = await queryAuth<{
      id: number; username: string; email: string; online: number; gmlevel: number; rbac_rank_id: number | null
    }>(
      accountWithRbacSql(isId ? `a.id = ${Number(search)}` : `a.username LIKE ?`),
      isId ? [] : [`%${search}%`]
    ).catch(() => [])

    return NextResponse.json({ accounts })
  }

  return NextResponse.json({ error: 'Parámetro search o history requerido' }, { status: 400 })
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  const directivo = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { accountId, rankId, reason } = parsed.data
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // ── Verify target exists ────────────────────────────────────────────────────
  const target = await queryAuthFirst<{ id: number; username: string }>(
    'SELECT id, username FROM account WHERE id = ?',
    [accountId]
  )
  if (!target) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  // ── Caller's own RBAC rank (re-read from DB, never trust the JWT) ───────────
  const callerRankId   = await getAccountRbacRank(directivo.id)
  const targetRankId   = await getAccountRbacRank(accountId)

  // ── Hierarchy check ─────────────────────────────────────────────────────────
  const auth = canAssignRank(callerRankId, targetRankId, rankId, directivo.id, accountId)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 403 })
  }

  // ── Protect last Owner ──────────────────────────────────────────────────────
  if (targetRankId === 90009 && rankId !== 90009) {
    const ownerCount = await countOwners()
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: 'No podés retirar el rango al último Owner activo.' },
        { status: 403 }
      )
    }
  }

  // ── Validate rankId exists in rbac_permissions ──────────────────────────────
  if (rankId !== null) {
    const permExists = await queryAuthFirst<{ id: number }>(
      'SELECT id FROM rbac_permissions WHERE id = ?',
      [rankId]
    )
    if (!permExists) {
      return NextResponse.json(
        { error: `El permiso RBAC ${rankId} no existe en rbac_permissions.` },
        { status: 422 }
      )
    }
  }

  // ── Atomic DB update ────────────────────────────────────────────────────────
  await withAuthTransaction(async (conn) => {
    // Remove ALL custom ranks (90000–90009) from target — keep other RBAC perms intact
    await conn.execute(
      'DELETE FROM rbac_account_permissions WHERE id = ? AND permission BETWEEN ? AND ?',
      [accountId, RBAC_MIN, RBAC_MAX]
    )
    // Assign new rank (if not null = remove)
    if (rankId !== null) {
      await conn.execute(
        'INSERT INTO rbac_account_permissions (id, permission, granted, realm_id) VALUES (?, ?, 1, -1)',
        [accountId, rankId]
      )
    }
  })

  // ── Determine action type for log ───────────────────────────────────────────
  let action: string
  if (targetRankId === null && rankId !== null)       action = 'ASSIGN_RBAC_RANK'
  else if (targetRankId !== null && rankId === null)  action = 'REMOVE_RBAC_RANK'
  else                                                action = 'CHANGE_RBAC_RANK'

  const oldName = targetRankId !== null ? (getRank(targetRankId)?.name ?? String(targetRankId)) : 'Sin rango'
  const newName = rankId       !== null ? (getRank(rankId)?.name       ?? String(rankId))       : 'Sin rango'

  const details =
    `${directivo.username} ${action === 'REMOVE_RBAC_RANK' ? 'retiró el rango RBAC de' : 'asignó rango RBAC a'} ` +
    `${target.username}: ${oldName} → ${newName}. Motivo: ${reason}`

  await logDirectivoAction(directivo.id, accountId, action, details, ip)

  return NextResponse.json({
    success: true,
    oldRankId: targetRankId,
    newRankId:  rankId,
    oldName,
    newName,
    // Remind caller that AC RBAC cache is session-scoped
    cacheNote: 'El cambio se guardó en acore_auth. AzerothCore lo aplicará cuando el usuario inicie sesión de nuevo.',
  })
}
