/**
 * Staff management actions for the Panel de Directivos.
 *
 * Every action: Directivo session re-verified in the DB (requireDirectivo) → target loaded
 * from AzerothCore → hierarchy rules → one transaction that writes the game rank
 * (account_access / RBAC when available) together with the CMS rows and the audit logs.
 * Directivos membership (wowargentina_directivos) is never touched from here.
 */
import { NextResponse, type NextRequest } from 'next/server'
import type { PoolConnection } from 'mysql2/promise'
import { queryAuth, queryCharacters, queryCms, withCmsTransaction } from '@/lib/db'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { isOwner } from '@/lib/roles'
import type { AuthorizedUser } from '@/lib/auth'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'
import { rateLimit } from '@/lib/rate-limit'
import { soapKick } from '@/lib/gm/soap-commands'
import {
  getRankSchema, getGmLevels, getRbacRanks, writeGameRank, countRbacOwners, sqlError,
} from '@/lib/staff/rbac-schema.server'
import { getMember, type StaffMember } from '@/lib/staff/data.server'
import {
  rankByKey, suspensionState, DIVISION_ROLE_LABEL, WARNING_TYPE_LABEL, SUSPENSION_SCOPE_LABEL,
  type DivisionRole, type RankKey, type SuspensionScope, type WarningStatus, type WarningType,
} from '@/lib/staff/ranks'

export class StaffActionError extends Error {
  constructor(message: string, public status = 400, public extra: Record<string, unknown> = {}) { super(message) }
}

export interface StaffCtx { user: AuthorizedUser; isOwner: boolean; ip: string }

export const GAME_APPLY_NOTE = 'Los permisos fueron actualizados. Los cambios se aplicarán en la próxima conexión al juego.'

export async function requireStaffAdmin(req: NextRequest, mutation = false): Promise<StaffCtx | Response> {
  const r = await requireDirectivo(req)
  if (r instanceof Response) return r
  if (mutation) {
    const rl = rateLimit(`staff:${r.id}`, 60, 10 * 60 * 1000)
    if (!rl.success) return NextResponse.json({ error: 'Demasiadas acciones seguidas. Esperá unos minutos.' }, { status: 429 })
  }
  return { user: r, isOwner: isOwner(r.access), ip: normalizeIP(getClientIP(req.headers)).normalizedIp }
}

export function staffErrorResponse(err: unknown, where: string) {
  if (err instanceof StaffActionError) return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status })
  console.error(`[staff:${where}]`, err)
  return NextResponse.json({ error: `No se pudo completar la operación (${sqlError(err)}). No se aplicó ningún cambio.` }, { status: 500 })
}

type Exec = Pick<PoolConnection, 'execute'>

// ── Audit helpers ───────────────────────────────────────────────────────────

async function activity(exec: Exec | null, ctx: StaffCtx, e: {
  targetId?: number | null; targetName?: string | null; action: string; reason?: string | null; details?: string | null
  result?: 'ok' | 'error' | 'denegado'; reference?: string | null
}) {
  const sql = `INSERT INTO cms_staff_activity (target_account_id, target_name, actor_account_id, actor_name, action, reason, details, result, reference, ip)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  const params = [e.targetId ?? null, e.targetName ?? null, ctx.user.id, ctx.user.username, e.action, e.reason?.slice(0, 300) ?? null,
    e.details?.slice(0, 1000) ?? null, e.result ?? 'ok', e.reference ?? null, ctx.ip]
  if (exec) await exec.execute(sql, params as never)
  else await queryCms(sql, params)
}

async function rankHistory(exec: Exec, ctx: StaffCtx, e: {
  targetId: number; operation: string; oldRank: RankKey | null; newRank: RankKey | null; oldGm: number; newGm: number
  oldRbac: number | null; newRbac: number | null; reason: string
}) {
  await exec.execute(
    `INSERT INTO cms_staff_rank_history (admin_account_id, target_account_id, old_rbac_rank_id, new_rbac_rank_id, old_rbac_name, new_rbac_name,
       reason, operation, ip, old_rank_key, new_rank_key, old_gmlevel, new_gmlevel, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok')`,
    [ctx.user.id, e.targetId, e.oldRbac, e.newRbac, rankByKey(e.oldRank)?.name ?? null, rankByKey(e.newRank)?.name ?? null,
      e.reason.slice(0, 300), e.operation, ctx.ip, e.oldRank, e.newRank, e.oldGm, e.newGm]
  )
}

/** Denied attempts are recorded too (outside any transaction). */
async function deny(ctx: StaffCtx, target: { id: number; username: string } | null, action: string, message: string): Promise<never> {
  await activity(null, ctx, { targetId: target?.id, targetName: target?.username, action: 'ACCION_DENEGADA', details: `${action}: ${message}`, result: 'denegado' }).catch(() => {})
  throw new StaffActionError(message, 403, { denied: true })
}

// ── Authorization ───────────────────────────────────────────────────────────

/**
 * - Nobody acts on themselves (except the Propietario joining a division).
 * - The Propietario account (directivo rango 'propietario' or ID 1) is never modified by staff operations.
 * - Only the Propietario may act on other Directivos.
 * - Co-Owner / Owner ranks (current or new) require the Propietario.
 */
export async function authorize(ctx: StaffCtx, target: StaffMember, action: string, opts: { ranks?: Array<RankKey | null | undefined>; allowSelfOwner?: boolean } = {}) {
  const self = target.id === ctx.user.id
  if (self && !(opts.allowSelfOwner && ctx.isOwner)) return deny(ctx, target, action, 'No podés aplicarte esta acción a vos mismo.')
  if (target.protected && !(self && opts.allowSelfOwner && ctx.isOwner)) {
    return deny(ctx, target, action, 'La cuenta del Propietario de WoW Argentina está protegida: ninguna operación de Staff puede modificarla.')
  }
  if (target.directivo && !ctx.isOwner) return deny(ctx, target, action, 'Solo el Propietario puede modificar a otros Directivos.')
  if ((opts.ranks ?? []).some(k => rankByKey(k)?.ownerOnly) && !ctx.isOwner) {
    return deny(ctx, target, action, 'Los cargos Co-Owner y Owner solo pueden ser asignados o modificados por el Propietario.')
  }
}

/** What the current user may do with this member (for the UI; the API re-checks everything). */
export function capabilities(ctx: StaffCtx, m: StaffMember) {
  let reason: string | null = null
  if (m.id === ctx.user.id) reason = 'Es tu propia cuenta.'
  else if (m.protected) reason = 'Cuenta del Propietario: protegida.'
  else if (m.directivo && !ctx.isOwner) reason = 'Es Directivo: solo el Propietario puede modificarlo.'
  else if (rankByKey(m.rank)?.ownerOnly && !ctx.isOwner) reason = 'Co-Owner / Owner: solo el Propietario.'
  return { canManage: !reason, reason, isOwner: ctx.isOwner }
}

async function loadTarget(id: number): Promise<StaffMember> {
  const m = await getMember(id)
  if (!m) throw new StaffActionError('No existe una cuenta con ese ID en acore_auth.account.', 404)
  return m
}

const hasGamePerms = (m: StaffMember) => m.gmlevel > 0 || m.rbacRankId != null

function requireConfirm(target: StaffMember, confirm: string | undefined, why: string) {
  if ((confirm ?? '').trim().toUpperCase() !== target.username.toUpperCase()) {
    throw new StaffActionError(`${why} Escribí el nombre de usuario (${target.username}) para confirmar.`, 428, { needsConfirm: true })
  }
}

async function onlineCharacter(accountId: number) {
  const rows = await queryCharacters<{ name: string }>('SELECT name FROM characters WHERE account = ? AND online = 1 LIMIT 1', [accountId]).catch(() => [])
  return rows[0]?.name ?? null
}

/** Optional: disconnect the target so the new permissions apply now (official .kick command). */
async function maybeKick(ctx: StaffCtx, target: StaffMember, kick: boolean | undefined) {
  if (!kick) return null
  const name = await onlineCharacter(target.id)
  if (!name) return { kicked: false, note: `${target.username} no está conectado al juego.` }
  try {
    const r = await soapKick(name, `Cambio de permisos de staff por ${ctx.user.username}`)
    if (r.ok) return { kicked: true, note: `Se desconectó a ${name}: los permisos nuevos se aplican al volver a conectarse.` }
    return { kicked: false, note: `No se pudo desconectar a ${name}: ${r.output}` }
  } catch (err) {
    return { kicked: false, note: `No se pudo desconectar a ${name}: ${err instanceof Error ? err.message : err}` }
  }
}

async function verifyGame(accountId: number, gmlevel: number | null, rbacId: number | null) {
  const schema = await getRankSchema()
  const [gm, rbac] = await Promise.all([getGmLevels([accountId]), getRbacRanks(schema, [accountId])])
  const okGm = (gm.get(accountId) ?? 0) === (gmlevel ?? 0)
  const expectRbac = schema.rbacWritable && rbacId != null && schema.rbac.registered.includes(rbacId) ? rbacId : null
  const okRbac = !schema.rbacWritable || (rbac.get(accountId) ?? null) === expectRbac
  return okGm && okRbac
}

function rbacNote(rbacId: number | null, schema: Awaited<ReturnType<typeof getRankSchema>>) {
  if (rbacId == null || !schema.rbac.accountPerms) return null
  if (!schema.rbacWritable) return 'El servidor tiene rbac_account_permissions pero no rbac_permissions: solo se aplicó el nivel GM.'
  if (!schema.rbac.registered.includes(rbacId)) return `El permiso RBAC ${rbacId} no está registrado en rbac_permissions: solo se aplicó el nivel GM.`
  return null
}

// ── Ranks: incorporar / asignar / ascender / degradar ───────────────────────

export type RankMode = 'incorporar' | 'asignar' | 'ascender' | 'degradar'

export async function changeRank(ctx: StaffCtx, targetId: number, input: {
  mode: RankMode; rank: RankKey; reason: string; confirm?: string; divisionId?: number; divisionRole?: DivisionRole; kick?: boolean
}) {
  const target = await loadTarget(targetId)
  const newRank = rankByKey(input.rank)!
  const current = rankByKey(target.rank)
  const label = { incorporar: 'Incorporar al staff', asignar: 'Asignar rango', ascender: 'Ascender', degradar: 'Degradar' }[input.mode]

  await authorize(ctx, target, label, { ranks: [target.rank, input.rank, target.pendingRestore?.prevRank] })

  if (target.status === 'suspendido' || target.status === 'pendiente_restauracion') {
    throw new StaffActionError('El miembro tiene una suspensión vigente o permisos pendientes de restaurar. Resolvé la suspensión primero.', 409)
  }
  if (input.mode === 'incorporar') {
    if (hasGamePerms(target)) {
      throw new StaffActionError(`${target.username} ya tiene permisos GM en el juego (${target.rank ? rankByKey(target.rank)!.name : `nivel ${target.gmlevel}`}). Gestionalo desde Staff y Rangos.`, 409)
    }
  } else {
    if (target.status === 'retirado' || target.status === 'sin_permisos') {
      throw new StaffActionError(`${target.username} no pertenece al staff. Usá "Incorporar al staff".`, 409)
    }
    if (input.mode === 'asignar' && current) throw new StaffActionError(`${target.username} ya tiene el rango ${current.name}. Usá Ascender o Degradar.`, 409)
    if (input.mode === 'ascender') {
      if (!current) throw new StaffActionError('El miembro no tiene un rango asignado. Usá "Asignar rango".', 409)
      if (newRank.order <= current.order) throw new StaffActionError(`${newRank.name} no es superior a ${current.name}.`, 400)
    }
    if (input.mode === 'degradar') {
      if (!current) throw new StaffActionError('El miembro no tiene un rango asignado.', 409)
      if (newRank.order >= current.order) throw new StaffActionError(`${newRank.name} no es inferior a ${current.name}.`, 400)
    }
  }
  if (newRank.elevated || current?.elevated) requireConfirm(target, input.confirm, `Cambiar un rango elevado (${(current?.elevated ? current : newRank).name}) requiere confirmación explícita.`)

  const schema = await getRankSchema()
  if (target.rbacRankId === 90009 && newRank.rbacId !== 90009 && (await countRbacOwners(schema)) <= 1) {
    throw new StaffActionError('No podés quitar el rango al último Owner registrado en RBAC.', 409)
  }

  let division: { id: number; name: string } | null = null
  if (input.mode === 'incorporar' && input.divisionId) {
    const [d] = await queryCms<{ id: number; name: string; active: number }>('SELECT id, name, active FROM cms_staff_divisions WHERE id = ?', [input.divisionId])
    if (!d || !d.active) throw new StaffActionError('La división elegida no existe o está desactivada.', 400)
    division = d
  }

  const op = { incorporar: 'incorporacion', asignar: 'asignacion', ascender: 'ascenso', degradar: 'degradacion' }[input.mode]
  const action = { incorporar: 'STAFF_INCORPORADO', asignar: 'STAFF_RANGO_ASIGNADO', ascender: 'STAFF_ASCENDIDO', degradar: 'STAFF_DEGRADADO' }[input.mode]
  const fromLabel = current?.name ?? (target.gmlevel ? `nivel GM ${target.gmlevel}` : 'Jugador')
  const gameChanged = target.gmlevel !== newRank.gmlevel || (schema.rbacWritable && target.rbacRankId !== newRank.rbacId)

  await withCmsTransaction(async conn => {
    await writeGameRank(conn, schema, target.id, newRank.gmlevel, newRank.rbacId, `WoW Argentina: ${newRank.name}`)
    await conn.execute(
      `INSERT INTO cms_staff_profiles (account_id, rank_key, status, joined_at, joined_by)
       VALUES (?, ?, 'activo', ${input.mode === 'incorporar' ? 'NOW()' : 'NULL'}, ?)
       ON DUPLICATE KEY UPDATE rank_key = VALUES(rank_key), status = 'activo',
         joined_at = ${input.mode === 'incorporar' ? 'NOW()' : 'joined_at'},
         joined_by = ${input.mode === 'incorporar' ? 'VALUES(joined_by)' : 'joined_by'},
         retired_at = ${input.mode === 'incorporar' ? 'NULL' : 'retired_at'},
         retired_by = ${input.mode === 'incorporar' ? 'NULL' : 'retired_by'},
         retire_reason = ${input.mode === 'incorporar' ? 'NULL' : 'retire_reason'}`,
      [target.id, newRank.key, input.mode === 'incorporar' ? ctx.user.id : null] as never)
    if (division) {
      await conn.execute(
        'INSERT INTO cms_staff_division_members (division_id, account_id, role, reason, assigned_by) VALUES (?, ?, ?, ?, ?)',
        [division.id, target.id, input.divisionRole ?? 'miembro', input.reason, ctx.user.id] as never)
      await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'DIVISION_ASIGNADA', reason: input.reason,
        details: `${division.name} · ${DIVISION_ROLE_LABEL[input.divisionRole ?? 'miembro']} (al incorporarse)`, reference: `division:${division.id}` })
    }
    await rankHistory(conn, ctx, { targetId: target.id, operation: op, oldRank: target.rank, newRank: newRank.key, oldGm: target.gmlevel, newGm: newRank.gmlevel,
      oldRbac: target.rbacRankId, newRbac: schema.rbacWritable ? newRank.rbacId : null, reason: input.reason })
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action, reason: input.reason,
      details: `${fromLabel} → ${newRank.name} (gmlevel ${target.gmlevel} → ${newRank.gmlevel})` })
    await logDirectivoAction(ctx.user.id, target.id, action, `${ctx.user.username}: ${label} ${target.username} ${fromLabel} → ${newRank.name}. Motivo: ${input.reason}`, ctx.ip, conn)
  })

  const verified = await verifyGame(target.id, newRank.gmlevel, newRank.rbacId)
  const kick = gameChanged ? await maybeKick(ctx, target, input.kick) : null
  const titles = { incorporar: '¡Incorporación completada!', asignar: 'Rango asignado', ascender: '¡Ascenso completado!', degradar: 'Degradación aplicada' }
  const messages = {
    incorporar: `El usuario ${target.username} fue incorporado al Staff de WoW Argentina como ${newRank.name}.`,
    asignar: `Se asignó el rango ${newRank.name} a ${target.username}.`,
    ascender: `El usuario ${target.username} fue ascendido correctamente al rango ${newRank.name}.`,
    degradar: `El usuario ${target.username} fue degradado al rango ${newRank.name}.`,
  }
  return {
    title: titles[input.mode],
    message: messages[input.mode],
    verified,
    applyNote: kick?.kicked ? kick.note : gameChanged ? GAME_APPLY_NOTE : `El nivel GM en el juego no cambia (sigue en ${newRank.gmlevel}).`,
    notes: [rbacNote(newRank.rbacId, schema), kick && !kick.kicked ? kick.note : null, division ? `Asignado a la división ${division.name}.` : null].filter(Boolean),
  }
}

// ── Retirar del staff ───────────────────────────────────────────────────────

export async function retireMember(ctx: StaffCtx, targetId: number, input: { reason: string; notes?: string; confirm?: string; kick?: boolean }) {
  const target = await loadTarget(targetId)
  await authorize(ctx, target, 'Retirar del staff', { ranks: [target.rank, target.pendingRestore?.prevRank] })
  if (target.status === 'retirado') throw new StaffActionError(`${target.username} ya fue retirado del staff.`, 409)
  if (target.status === 'sin_permisos') throw new StaffActionError(`${target.username} no pertenece al staff.`, 409)
  requireConfirm(target, input.confirm, 'Retirar a un miembro revoca sus permisos GM.')

  const schema = await getRankSchema()
  if (target.rbacRankId === 90009 && (await countRbacOwners(schema)) <= 1) {
    throw new StaffActionError('No podés retirar al último Owner registrado en RBAC.', 409)
  }
  const hadPerms = hasGamePerms(target)

  await withCmsTransaction(async conn => {
    await writeGameRank(conn, schema, target.id, null, null, '')
    await conn.execute(
      `INSERT INTO cms_staff_profiles (account_id, rank_key, status, retired_at, retired_by, retire_reason, notes)
       VALUES (?, NULL, 'retirado', NOW(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE rank_key = NULL, status = 'retirado', retired_at = NOW(), retired_by = VALUES(retired_by),
         retire_reason = VALUES(retire_reason),
         notes = IF(VALUES(notes) IS NULL OR VALUES(notes) = '', notes, CONCAT_WS('\n', notes, VALUES(notes)))`,
      [target.id, ctx.user.id, input.reason, input.notes ? `[Retiro] ${input.notes}` : null] as never)
    await conn.execute(
      `UPDATE cms_staff_division_members SET active = 0, removed_at = NOW(), removed_by = ?, removed_reason = 'Retiro del staff'
       WHERE account_id = ? AND active = 1`, [ctx.user.id, target.id] as never)
    await conn.execute(
      `UPDATE cms_staff_suspensions SET status = 'levantada', lifted_at = NOW(), lifted_by = ?, lift_reason = 'Retiro del staff'
       WHERE account_id = ? AND status = 'vigente' AND ends_at > NOW()`, [ctx.user.id, target.id] as never)
    await rankHistory(conn, ctx, { targetId: target.id, operation: 'retiro', oldRank: target.rank, newRank: null, oldGm: target.gmlevel, newGm: 0,
      oldRbac: target.rbacRankId, newRbac: null, reason: input.reason })
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'STAFF_RETIRADO', reason: input.reason,
      details: `${rankByKey(target.rank)?.name ?? `nivel GM ${target.gmlevel}`} → retirado. Divisiones cerradas: ${target.divisions.map(d => d.name).join(', ') || 'ninguna'}.${input.notes ? ` Observaciones: ${input.notes}` : ''}` })
    await logDirectivoAction(ctx.user.id, target.id, 'STAFF_RETIRADO', `${ctx.user.username} retiró del staff a ${target.username}. Motivo: ${input.reason}`, ctx.ip, conn)
  })

  const verified = await verifyGame(target.id, null, null)
  const kick = hadPerms ? await maybeKick(ctx, target, input.kick) : null
  return {
    title: 'Miembro retirado',
    message: `El usuario ${target.username} fue retirado del equipo de Staff de WoW Argentina.`,
    verified,
    applyNote: kick?.kicked ? kick.note : hadPerms ? GAME_APPLY_NOTE : null,
    notes: [
      'La cuenta y sus personajes se conservan; el expediente queda en el historial.',
      target.directivo ? 'Su acceso al Panel de Directivos no cambia: se gestiona en Gestión de Directivos.' : null,
      kick && !kick.kicked ? kick.note : null,
    ].filter(Boolean),
  }
}

// ── Advertencias ────────────────────────────────────────────────────────────

export async function issueWarning(ctx: StaffCtx, targetId: number, input: { type: WarningType; reason: string; description?: string }) {
  const target = await loadTarget(targetId)
  await authorize(ctx, target, 'Emitir advertencia', { ranks: [target.rank] })
  if (target.status === 'retirado' || target.status === 'sin_permisos') throw new StaffActionError(`${target.username} no pertenece al staff.`, 409)

  let id = 0
  await withCmsTransaction(async conn => {
    const [r] = await conn.execute(
      'INSERT INTO cms_staff_warnings (account_id, type, reason, description, issued_by) VALUES (?, ?, ?, ?, ?)',
      [target.id, input.type, input.reason, input.description || null, ctx.user.id] as never)
    id = (r as { insertId: number }).insertId
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'ADVERTENCIA_EMITIDA', reason: input.reason,
      details: WARNING_TYPE_LABEL[input.type], reference: `advertencia:${id}` })
    await logDirectivoAction(ctx.user.id, target.id, 'STAFF_ADVERTENCIA', `${ctx.user.username} advirtió a ${target.username} (${WARNING_TYPE_LABEL[input.type]}). Motivo: ${input.reason}`, ctx.ip, conn)
  })
  return { id, title: 'Advertencia registrada', message: `Se registró correctamente una advertencia para ${target.username}.` }
}

export async function updateWarning(ctx: StaffCtx, warningId: number, input: { status: WarningStatus; note?: string }) {
  const [w] = await queryCms<{ id: number; account_id: number; status: WarningStatus; type: WarningType }>('SELECT id, account_id, status, type FROM cms_staff_warnings WHERE id = ?', [warningId])
  if (!w) throw new StaffActionError('La advertencia no existe.', 404)
  const target = await loadTarget(w.account_id)
  await authorize(ctx, target, 'Cambiar estado de advertencia', { ranks: [target.rank] })
  if (w.status === 'anulada') throw new StaffActionError('Una advertencia anulada no puede cambiar de estado.', 409)
  if (w.status === input.status) throw new StaffActionError('La advertencia ya está en ese estado.', 409)
  if ((input.status === 'anulada' || input.status === 'apelada') && (input.note ?? '').trim().length < 5) {
    throw new StaffActionError('Indicá el motivo (mínimo 5 caracteres).', 400)
  }
  await withCmsTransaction(async conn => {
    await conn.execute(
      'UPDATE cms_staff_warnings SET status = ?, status_changed_by = ?, status_changed_at = NOW(), status_note = ? WHERE id = ? AND status = ?',
      [input.status, ctx.user.id, input.note?.trim() || null, w.id, w.status] as never)
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: `ADVERTENCIA_${input.status.toUpperCase()}`, reason: input.note ?? null,
      details: `${WARNING_TYPE_LABEL[w.type]}: ${w.status} → ${input.status}`, reference: `advertencia:${w.id}` })
  })
  const verb = { vigente: 'vuelve a estar vigente', revisada: 'fue marcada como revisada', apelada: 'fue marcada como apelada', anulada: 'fue anulada' }[input.status]
  return { title: 'Advertencia actualizada', message: `La advertencia de ${target.username} ${verb}.` }
}

// ── Suspensiones ────────────────────────────────────────────────────────────

const MAX_SUSPENSION_MS = 365 * 24 * 3600 * 1000

export async function suspendMember(ctx: StaffCtx, targetId: number, input: {
  scope: SuspensionScope; startsAt?: string; endsAt: string; reason: string; notes?: string; kick?: boolean
}) {
  const target = await loadTarget(targetId)
  await authorize(ctx, target, 'Suspender staff', { ranks: [target.rank] })
  if (target.status !== 'activo') throw new StaffActionError(`${target.username} no está activo en el staff (${target.status}).`, 409)

  const now = Date.now()
  const start = input.scope === 'juego' || !input.startsAt ? new Date(now) : new Date(input.startsAt)
  const end = new Date(input.endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new StaffActionError('Fechas inválidas.', 400)
  if (start.getTime() < now - 5 * 60 * 1000) throw new StaffActionError('La fecha de inicio no puede estar en el pasado.', 400)
  if (end.getTime() <= start.getTime()) throw new StaffActionError('La fecha de finalización debe ser posterior al inicio.', 400)
  if (end.getTime() - start.getTime() > MAX_SUSPENSION_MS) throw new StaffActionError('La suspensión no puede superar los 365 días.', 400)

  const [overlap] = await queryCms<{ n: number }>(
    `SELECT COUNT(*) AS n FROM cms_staff_suspensions WHERE account_id = ? AND status = 'vigente' AND ends_at > ? AND starts_at < ?`,
    [target.id, start, end]
  )
  if (Number(overlap?.n ?? 0) > 0) throw new StaffActionError('Ya hay una suspensión que se superpone con esas fechas.', 409)

  const schema = await getRankSchema()
  const game = input.scope === 'juego'
  if (game && !hasGamePerms(target)) throw new StaffActionError(`${target.username} no tiene permisos GM en el juego para revocar.`, 409)
  if (game && target.rbacRankId === 90009 && (await countRbacOwners(schema)) <= 1) {
    throw new StaffActionError('No podés revocar los permisos del último Owner registrado en RBAC.', 409)
  }

  let id = 0
  await withCmsTransaction(async conn => {
    const [r] = await conn.execute(
      `INSERT INTO cms_staff_suspensions (account_id, scope, starts_at, ends_at, reason, notes, created_by, prev_rank_key, prev_gmlevel, prev_rbac_rank)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [target.id, input.scope, start, end, input.reason, input.notes || null, ctx.user.id,
        game ? target.rank : null, game ? target.gmlevel : null, game ? target.rbacRankId : null] as never)
    id = (r as { insertId: number }).insertId
    if (game) {
      await writeGameRank(conn, schema, target.id, null, null, '')
      await rankHistory(conn, ctx, { targetId: target.id, operation: 'suspension', oldRank: target.rank, newRank: target.rank, oldGm: target.gmlevel, newGm: 0,
        oldRbac: target.rbacRankId, newRbac: null, reason: input.reason })
    }
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'SUSPENSION_APLICADA', reason: input.reason,
      details: `${SUSPENSION_SCOPE_LABEL[input.scope]} · ${start.toISOString()} → ${end.toISOString()}${input.notes ? ` · ${input.notes}` : ''}`, reference: `suspension:${id}` })
    await logDirectivoAction(ctx.user.id, target.id, 'STAFF_SUSPENSION', `${ctx.user.username} suspendió a ${target.username} (${SUSPENSION_SCOPE_LABEL[input.scope]}). Motivo: ${input.reason}`, ctx.ip, conn)
  })

  const verified = game ? await verifyGame(target.id, null, null) : true
  const kick = game ? await maybeKick(ctx, target, input.kick) : null
  return {
    id,
    title: 'Suspensión aplicada',
    message: `${target.username} quedó suspendido hasta el ${end.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.`,
    verified,
    applyNote: game ? (kick?.kicked ? kick.note : GAME_APPLY_NOTE) : 'Mientras dure, no puede usar las herramientas del Panel GM. Sus permisos en el juego no cambian.',
    notes: [game ? 'Al finalizar, los permisos NO se restauran solos: un Directivo debe confirmarlo desde el expediente.' : null, kick && !kick.kicked ? kick.note : null].filter(Boolean),
  }
}

async function loadSuspension(id: number) {
  const [s] = await queryCms<{
    id: number; account_id: number; scope: SuspensionScope; status: string; starts_at: Date; ends_at: Date
    prev_rank_key: string | null; prev_gmlevel: number | null; prev_rbac_rank: number | null; restored_at: Date | null
  }>('SELECT * FROM cms_staff_suspensions WHERE id = ?', [id])
  if (!s) throw new StaffActionError('La suspensión no existe.', 404)
  return s
}

export async function liftSuspension(ctx: StaffCtx, suspensionId: number, input: { reason: string }) {
  const s = await loadSuspension(suspensionId)
  const target = await loadTarget(s.account_id)
  await authorize(ctx, target, 'Levantar suspensión', { ranks: [target.rank, s.prev_rank_key as RankKey] })
  const state = suspensionState(s)
  if (state !== 'vigente' && state !== 'programada') throw new StaffActionError('La suspensión ya no está vigente.', 409)

  await withCmsTransaction(async conn => {
    await conn.execute(
      `UPDATE cms_staff_suspensions SET status = 'levantada', lifted_at = NOW(), lifted_by = ?, lift_reason = ? WHERE id = ? AND status = 'vigente'`,
      [ctx.user.id, input.reason, s.id] as never)
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'SUSPENSION_LEVANTADA', reason: input.reason,
      details: SUSPENSION_SCOPE_LABEL[s.scope], reference: `suspension:${s.id}` })
    await logDirectivoAction(ctx.user.id, target.id, 'STAFF_SUSPENSION_LEVANTADA', `${ctx.user.username} levantó la suspensión de ${target.username}. Motivo: ${input.reason}`, ctx.ip, conn)
  })
  return {
    title: 'Suspensión levantada',
    message: `Se levantó la suspensión de ${target.username}.`,
    notes: s.scope === 'juego' && (s.prev_gmlevel ?? 0) > 0
      ? ['Los permisos en el juego NO se restauraron automáticamente. Verificá la cuenta y usá "Restaurar permisos".']
      : [],
  }
}

export async function restorePermissions(ctx: StaffCtx, suspensionId: number, input: { reason: string; kick?: boolean }) {
  const s = await loadSuspension(suspensionId)
  if (s.scope !== 'juego' || !(s.prev_gmlevel && s.prev_gmlevel > 0)) throw new StaffActionError('Esta suspensión no revocó permisos en el juego.', 409)
  if (s.restored_at) throw new StaffActionError('Los permisos de esta suspensión ya fueron restaurados.', 409)
  const state = suspensionState(s)
  if (state === 'vigente' || state === 'programada') throw new StaffActionError('La suspensión sigue vigente: levantala o esperá a que finalice.', 409)

  const target = await loadTarget(s.account_id)
  const prev = rankByKey(s.prev_rank_key)
  await authorize(ctx, target, 'Restaurar permisos', { ranks: [prev?.key] })
  if (target.status === 'retirado') throw new StaffActionError(`${target.username} fue retirado del staff: no se restauran permisos.`, 409)
  if (hasGamePerms(target)) {
    throw new StaffActionError(`La cuenta ya tiene permisos en el juego (nivel ${target.gmlevel}). Revisá el expediente antes de restaurar.`, 409)
  }
  const [ban] = await queryAuth<{ n: number }>(
    'SELECT COUNT(*) AS n FROM account_banned WHERE id = ? AND active = 1 AND (unbandate = bandate OR unbandate > UNIX_TIMESTAMP())', [target.id]
  )
  if (Number(ban?.n ?? 0) > 0) throw new StaffActionError(`${target.username} tiene un baneo activo: no se restauran privilegios.`, 409)

  const schema = await getRankSchema()
  const gmlevel = prev?.gmlevel ?? s.prev_gmlevel
  const rbacId = prev?.rbacId ?? s.prev_rbac_rank
  await withCmsTransaction(async conn => {
    await writeGameRank(conn, schema, target.id, gmlevel, rbacId, prev ? `WoW Argentina: ${prev.name}` : '')
    await conn.execute(`UPDATE cms_staff_suspensions SET restored_at = NOW(), restored_by = ? WHERE id = ? AND restored_at IS NULL`, [ctx.user.id, s.id] as never)
    if (prev) await conn.execute(`UPDATE cms_staff_profiles SET rank_key = ? WHERE account_id = ?`, [prev.key, target.id] as never)
    await rankHistory(conn, ctx, { targetId: target.id, operation: 'restauracion', oldRank: target.rank, newRank: prev?.key ?? null, oldGm: target.gmlevel, newGm: gmlevel,
      oldRbac: target.rbacRankId, newRbac: schema.rbacWritable ? rbacId : null, reason: input.reason })
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'PERMISOS_RESTAURADOS', reason: input.reason,
      details: `${prev?.name ?? 'Nivel previo'} (gmlevel ${gmlevel})`, reference: `suspension:${s.id}` })
    await logDirectivoAction(ctx.user.id, target.id, 'STAFF_PERMISOS_RESTAURADOS', `${ctx.user.username} restauró los permisos de ${target.username}. Motivo: ${input.reason}`, ctx.ip, conn)
  })
  const verified = await verifyGame(target.id, gmlevel, rbacId)
  return {
    title: 'Permisos restaurados',
    message: `Se restauraron los permisos de ${target.username} (${prev?.name ?? `nivel ${gmlevel}`}).`,
    verified,
    applyNote: GAME_APPLY_NOTE,
    notes: [rbacNote(rbacId, schema)].filter(Boolean),
  }
}

// ── Expediente ──────────────────────────────────────────────────────────────

export async function updateProfile(ctx: StaffCtx, targetId: number, input: { joinedAt?: string | null; notes?: string | null }) {
  const target = await loadTarget(targetId)
  await authorize(ctx, target, 'Editar expediente', { ranks: [target.rank] })
  if (target.status === 'sin_permisos') throw new StaffActionError(`${target.username} no pertenece al staff.`, 409)
  const joined = input.joinedAt ? new Date(`${input.joinedAt}T12:00:00`) : null
  if (joined && (Number.isNaN(joined.getTime()) || joined.getTime() > Date.now())) throw new StaffActionError('Fecha de ingreso inválida.', 400)

  await withCmsTransaction(async conn => {
    await conn.execute(
      `INSERT INTO cms_staff_profiles (account_id, rank_key, status, joined_at, notes) VALUES (?, ?, 'activo', ?, ?)
       ON DUPLICATE KEY UPDATE ${input.joinedAt !== undefined ? 'joined_at = VALUES(joined_at),' : ''} ${input.notes !== undefined ? 'notes = VALUES(notes),' : ''} account_id = account_id`,
      [target.id, target.rank, joined, input.notes ?? null] as never)
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'STAFF_PERFIL_EDITADO',
      details: [input.joinedAt !== undefined ? `Ingreso: ${input.joinedAt || 'sin registrar'}` : null, input.notes !== undefined ? 'Observaciones actualizadas' : null].filter(Boolean).join(' · ') })
  })
  return { title: 'Expediente actualizado', message: `Se guardaron los cambios del expediente de ${target.username}.` }
}

// ── Divisiones ──────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'division'
}
function isDup(err: unknown) { return (err as { code?: string })?.code === 'ER_DUP_ENTRY' }

export async function createDivision(ctx: StaffCtx, input: { name: string; description: string; color: string }) {
  let id = 0
  try {
    await withCmsTransaction(async conn => {
      const [r] = await conn.execute('INSERT INTO cms_staff_divisions (slug, name, description, color, created_by) VALUES (?, ?, ?, ?, ?)',
        [slugify(input.name), input.name, input.description, input.color, ctx.user.id] as never)
      id = (r as { insertId: number }).insertId
      await activity(conn, ctx, { action: 'DIVISION_CREADA', details: input.name, reference: `division:${id}` })
      await logDirectivoAction(ctx.user.id, null, 'STAFF_DIVISION_CREADA', `${ctx.user.username} creó la división ${input.name}`, ctx.ip, conn)
    })
  } catch (err) {
    if (isDup(err)) throw new StaffActionError('Ya existe una división con ese nombre.', 409)
    throw err
  }
  return { id, title: 'División creada', message: `Se creó la división ${input.name}.` }
}

export async function updateDivision(ctx: StaffCtx, id: number, input: { name?: string; description?: string; color?: string; active?: boolean; reason?: string }) {
  const [d] = await queryCms<{ id: number; name: string; active: number }>('SELECT id, name, active FROM cms_staff_divisions WHERE id = ?', [id])
  if (!d) throw new StaffActionError('La división no existe.', 404)
  const sets: string[] = []; const params: unknown[] = []
  if (input.name !== undefined) { sets.push('name = ?', 'slug = ?'); params.push(input.name, slugify(input.name)) }
  if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description) }
  if (input.color !== undefined) { sets.push('color = ?'); params.push(input.color) }
  if (input.active !== undefined) { sets.push('active = ?'); params.push(input.active ? 1 : 0) }
  if (!sets.length) throw new StaffActionError('No hay cambios para guardar.', 400)
  const action = input.active === false ? 'DIVISION_DESACTIVADA' : input.active === true && !d.active ? 'DIVISION_ACTIVADA' : 'DIVISION_EDITADA'
  try {
    await withCmsTransaction(async conn => {
      await conn.execute(`UPDATE cms_staff_divisions SET ${sets.join(', ')} WHERE id = ?`, [...params, id] as never)
      await activity(conn, ctx, { action, reason: input.reason ?? null, details: input.name && input.name !== d.name ? `${d.name} → ${input.name}` : d.name, reference: `division:${id}` })
    })
  } catch (err) {
    if (isDup(err)) throw new StaffActionError('Ya existe una división con ese nombre.', 409)
    throw err
  }
  const name = input.name ?? d.name
  return {
    title: 'División actualizada',
    message: action === 'DIVISION_DESACTIVADA' ? `La división ${name} fue desactivada. Sus miembros e historial se conservan.`
      : action === 'DIVISION_ACTIVADA' ? `La división ${name} fue reactivada.` : `Se guardaron los cambios de ${name}.`,
  }
}

async function loadDivision(id: number) {
  const [d] = await queryCms<{ id: number; name: string; active: number }>('SELECT id, name, active FROM cms_staff_divisions WHERE id = ?', [id])
  if (!d) throw new StaffActionError('La división no existe.', 404)
  return d
}

export async function assignDivision(ctx: StaffCtx, divisionId: number, input: { accountId: number; role: DivisionRole; reason: string }) {
  const d = await loadDivision(divisionId)
  if (!d.active) throw new StaffActionError(`La división ${d.name} está desactivada.`, 409)
  const target = await loadTarget(input.accountId)
  await authorize(ctx, target, 'Asignar división', { allowSelfOwner: true })
  if (!['activo', 'suspendido', 'pendiente_restauracion'].includes(target.status)) {
    throw new StaffActionError(`${target.username} no pertenece al staff: incorporalo antes de asignarle una división.`, 409)
  }
  const [exists] = await queryCms<{ n: number }>('SELECT COUNT(*) AS n FROM cms_staff_division_members WHERE division_id = ? AND account_id = ? AND active = 1', [d.id, target.id])
  if (Number(exists?.n ?? 0) > 0) throw new StaffActionError(`${target.username} ya pertenece a ${d.name}. Podés cambiar su cargo desde la división.`, 409)

  const replaced = input.role === 'responsable' ? await currentLead(d.id) : null
  try {
    await withCmsTransaction(async conn => {
      if (replaced) await demoteLead(conn, ctx, d, replaced)
      await conn.execute('INSERT INTO cms_staff_division_members (division_id, account_id, role, reason, assigned_by) VALUES (?, ?, ?, ?, ?)',
        [d.id, target.id, input.role, input.reason, ctx.user.id] as never)
      await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'DIVISION_ASIGNADA', reason: input.reason,
        details: `${d.name} · ${DIVISION_ROLE_LABEL[input.role]}`, reference: `division:${d.id}` })
      await logDirectivoAction(ctx.user.id, target.id, 'STAFF_DIVISION_ASIGNADA', `${ctx.user.username} asignó a ${target.username} a ${d.name} (${DIVISION_ROLE_LABEL[input.role]}). Motivo: ${input.reason}`, ctx.ip, conn)
    })
  } catch (err) {
    if (isDup(err)) throw new StaffActionError(`${target.username} ya pertenece a ${d.name}.`, 409)
    throw err
  }
  return {
    title: 'División actualizada',
    message: `El usuario ${target.username} fue asignado correctamente a la división ${d.name}.`,
    notes: replaced ? [`${replaced.username} pasó de Responsable a Miembro.`] : [],
  }
}

async function currentLead(divisionId: number) {
  const [row] = await queryCms<{ id: number; account_id: number }>(
    `SELECT id, account_id FROM cms_staff_division_members WHERE division_id = ? AND active = 1 AND role = 'responsable' LIMIT 1`, [divisionId]
  )
  if (!row) return null
  const m = await getMember(row.account_id)
  return { id: row.id, accountId: row.account_id, username: m?.username ?? `#${row.account_id}` }
}

async function demoteLead(conn: Exec, ctx: StaffCtx, d: { id: number; name: string }, lead: { id: number; accountId: number; username: string }) {
  await conn.execute(`UPDATE cms_staff_division_members SET role = 'miembro' WHERE id = ?`, [lead.id] as never)
  await activity(conn, ctx, { targetId: lead.accountId, targetName: lead.username, action: 'DIVISION_CARGO', reason: 'Cambio de responsable',
    details: `${d.name}: Responsable → Miembro`, reference: `division:${d.id}` })
}

export async function updateMembership(ctx: StaffCtx, divisionId: number, accountId: number, input:
  { action: 'role'; role: DivisionRole; reason: string } | { action: 'remove'; reason: string }) {
  const d = await loadDivision(divisionId)
  const target = await loadTarget(accountId)
  await authorize(ctx, target, input.action === 'remove' ? 'Quitar de división' : 'Cambiar cargo de división', { allowSelfOwner: true })
  const [row] = await queryCms<{ id: number; role: DivisionRole }>(
    'SELECT id, role FROM cms_staff_division_members WHERE division_id = ? AND account_id = ? AND active = 1', [d.id, target.id]
  )
  if (!row) throw new StaffActionError(`${target.username} no pertenece a ${d.name}.`, 404)

  if (input.action === 'remove') {
    await withCmsTransaction(async conn => {
      await conn.execute('UPDATE cms_staff_division_members SET active = 0, removed_at = NOW(), removed_by = ?, removed_reason = ? WHERE id = ?',
        [ctx.user.id, input.reason, row.id] as never)
      await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'DIVISION_RETIRADA', reason: input.reason,
        details: `${d.name} · ${DIVISION_ROLE_LABEL[row.role]}`, reference: `division:${d.id}` })
      await logDirectivoAction(ctx.user.id, target.id, 'STAFF_DIVISION_RETIRADA', `${ctx.user.username} quitó a ${target.username} de ${d.name}. Motivo: ${input.reason}`, ctx.ip, conn)
    })
    return { title: 'División actualizada', message: `${target.username} ya no forma parte de ${d.name}.` }
  }

  if (row.role === input.role) throw new StaffActionError('Ese ya es su cargo.', 409)
  const replaced = input.role === 'responsable' ? await currentLead(d.id) : null
  await withCmsTransaction(async conn => {
    if (replaced && replaced.accountId !== target.id) await demoteLead(conn, ctx, d, replaced)
    await conn.execute('UPDATE cms_staff_division_members SET role = ? WHERE id = ?', [input.role, row.id] as never)
    await activity(conn, ctx, { targetId: target.id, targetName: target.username, action: 'DIVISION_CARGO', reason: input.reason,
      details: `${d.name}: ${DIVISION_ROLE_LABEL[row.role]} → ${DIVISION_ROLE_LABEL[input.role]}`, reference: `division:${d.id}` })
  })
  return {
    title: 'División actualizada',
    message: `${target.username} ahora es ${DIVISION_ROLE_LABEL[input.role]} en ${d.name}.`,
    notes: replaced && replaced.accountId !== target.id ? [`${replaced.username} pasó de Responsable a Miembro.`] : [],
  }
}
