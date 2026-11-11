/**
 * Staff data read from the real sources:
 *   acore_auth.account / account_access / rbac_* (detected) → who is staff and with what level
 *   wowargentina_cms.cms_staff_*                           → internal file, divisions, warnings…
 *   cms_tickets / cms_ticket_replies / cms_gm_sanctions / cms_gm_logs → performance
 * Errors are thrown (never turned into an empty list).
 */
import { queryAuth, queryCms } from '@/lib/db'
import {
  getRankSchema, getRbacRanks, getGmLevels, getAccountAccessRows, getAccountRbacRows,
  getLinkedPermissions, sqlError, type RankSchema,
} from '@/lib/staff/rbac-schema.server'
import {
  rankByKey, rankByRbac, suspensionState, type DivisionRole, type MemberStatus, type RankKey,
  type SuspensionScope, type SuspensionState, type WarningStatus, type WarningType,
} from '@/lib/staff/ranks'

export class StaffDataError extends Error {
  constructor(message: string, public status = 500) { super(message) }
}

const ph = (n: number) => Array.from({ length: n }, () => '?').join(',')

interface ProfileRow {
  account_id: number; rank_key: string | null; status: 'activo' | 'retirado'; joined_at: Date | null; joined_by: number | null
  retired_at: Date | null; retired_by: number | null; retire_reason: string | null; notes: string | null; updated_at: Date
}
interface SuspensionRow {
  id: number; account_id: number; scope: SuspensionScope; starts_at: Date; ends_at: Date; reason: string; notes: string | null
  status: 'vigente' | 'levantada'; created_by: number; created_at: Date; lifted_by: number | null; lifted_at: Date | null
  lift_reason: string | null; prev_rank_key: string | null; prev_gmlevel: number | null; prev_rbac_rank: number | null
  restored_by: number | null; restored_at: Date | null
}

export interface MemberDivision { id: number; name: string; color: string; role: DivisionRole; assignedAt: Date }

export interface StaffMember {
  id: number
  username: string
  email: string | null
  lastLogin: Date | null
  online: boolean
  gmlevel: number
  rbacRankId: number | null
  rank: RankKey | null
  rankSource: 'rbac' | 'expediente' | null
  expectedGmlevel: number | null
  gmlevelMismatch: boolean
  status: MemberStatus
  joinedAt: Date | null
  joinedByName: string | null
  divisions: MemberDivision[]
  warnings: number
  suspension: { id: number; scope: SuspensionScope; state: SuspensionState; startsAt: Date; endsAt: Date } | null
  pendingRestore: { suspensionId: number; prevRank: RankKey | null; prevGmlevel: number | null } | null
  directivo: 'propietario' | 'directivo' | null
  protected: boolean
}

async function fetchAccounts(ids: number[]) {
  if (!ids.length) return new Map<number, { id: number; username: string; email: string | null; last_login: Date | null; online: number; joindate: Date }>()
  const rows = await queryAuth<{ id: number; username: string; email: string | null; last_login: Date | null; online: number; joindate: Date }>(
    `SELECT id, username, email, last_login, online, joindate FROM account WHERE id IN (${ph(ids.length)})`, ids
  )
  return new Map(rows.map(r => [Number(r.id), r]))
}

async function fetchNames(ids: Array<number | null | undefined>) {
  const uniq = [...new Set(ids.filter((v): v is number => !!v))]
  if (!uniq.length) return new Map<number, string>()
  const rows = await queryAuth<{ id: number; username: string }>(`SELECT id, username FROM account WHERE id IN (${ph(uniq.length)})`, uniq)
  return new Map(rows.map(r => [Number(r.id), r.username]))
}

async function fetchDirectivos() {
  const rows = await queryCms<{ account_id: number; rango: 'propietario' | 'directivo' }>(
    'SELECT account_id, rango FROM wowargentina_directivos WHERE activo = 1 AND fecha_baja IS NULL'
  ).catch(() => [])
  return new Map(rows.map(r => [Number(r.account_id), r.rango]))
}

/**
 * Builds members for the given accounts. `profiles`/`suspensions` must include the rows of
 * those accounts; gm/rbac maps come from AzerothCore.
 */
async function buildMembers(
  ids: number[],
  ctx: { gm: Map<number, number>; rbac: Map<number, number>; profiles: Map<number, ProfileRow>; suspensions: SuspensionRow[] }
): Promise<StaffMember[]> {
  if (!ids.length) return []
  const [accounts, directivos, divisions, warnings] = await Promise.all([
    fetchAccounts(ids),
    fetchDirectivos(),
    queryCms<{ account_id: number; id: number; name: string; color: string; role: DivisionRole; assigned_at: Date }>(
      `SELECT m.account_id, d.id, d.name, d.color, m.role, m.assigned_at
       FROM cms_staff_division_members m JOIN cms_staff_divisions d ON d.id = m.division_id
       WHERE m.active = 1 AND m.account_id IN (${ph(ids.length)})
       ORDER BY FIELD(m.role,'responsable','subresponsable','supervisor','miembro','en_formacion'), d.name`, ids
    ),
    queryCms<{ account_id: number; n: number }>(
      `SELECT account_id, COUNT(*) AS n FROM cms_staff_warnings WHERE status = 'vigente' AND account_id IN (${ph(ids.length)}) GROUP BY account_id`, ids
    ),
  ])
  const names = await fetchNames([...ctx.profiles.values()].map(p => p.joined_by))
  const now = Date.now()

  return ids.filter(id => accounts.has(id)).map(id => {
    const a = accounts.get(id)!
    const p = ctx.profiles.get(id) ?? null
    const gmlevel = ctx.gm.get(id) ?? 0
    const rbacRankId = ctx.rbac.get(id) ?? null
    const hasPerms = gmlevel > 0 || rbacRankId != null
    const susp = ctx.suspensions.filter(s => s.account_id === id)

    const current = susp.find(s => suspensionState(s, now) === 'vigente') ?? null
    const pending = !hasPerms && p?.status === 'activo'
      ? susp.find(s => s.scope === 'juego' && !s.restored_at && (s.prev_gmlevel ?? 0) > 0 && suspensionState(s, now) !== 'vigente' && suspensionState(s, now) !== 'programada') ?? null
      : null
    const gameSuspended = !!current && current.scope === 'juego'

    let rank: RankKey | null = null
    let rankSource: StaffMember['rankSource'] = null
    if (rbacRankId != null && rankByRbac(rbacRankId)) { rank = rankByRbac(rbacRankId)!.key; rankSource = 'rbac' }
    else if (p?.status === 'activo' && rankByKey(p.rank_key)) { rank = p.rank_key as RankKey; rankSource = 'expediente' }

    let status: MemberStatus
    if (p?.status === 'retirado' && !hasPerms) status = 'retirado'
    else if (current) status = 'suspendido'
    else if (pending) status = 'pendiente_restauracion'
    else if (hasPerms) status = 'activo'
    else status = 'sin_permisos'

    const expected = rank ? rankByKey(rank)!.gmlevel : null
    const dir = directivos.get(id) ?? null
    return {
      id,
      username: a.username,
      email: a.email,
      lastLogin: a.last_login,
      online: Number(a.online) > 0,
      gmlevel,
      rbacRankId,
      rank,
      rankSource,
      expectedGmlevel: expected,
      gmlevelMismatch: expected != null && hasPerms && !gameSuspended && gmlevel !== expected,
      status,
      joinedAt: p?.joined_at ?? null,
      joinedByName: p?.joined_by ? names.get(p.joined_by) ?? `#${p.joined_by}` : null,
      divisions: divisions.filter(d => Number(d.account_id) === id).map(d => ({ id: d.id, name: d.name, color: d.color, role: d.role, assignedAt: d.assigned_at })),
      warnings: Number(warnings.find(w => Number(w.account_id) === id)?.n ?? 0),
      suspension: current ? { id: current.id, scope: current.scope, state: 'vigente', startsAt: current.starts_at, endsAt: current.ends_at } : null,
      pendingRestore: pending ? { suspensionId: pending.id, prevRank: (rankByKey(pending.prev_rank_key)?.key ?? null), prevGmlevel: pending.prev_gmlevel } : null,
      directivo: dir,
      protected: dir === 'propietario' || id === 1,
    }
  })
}

async function loadContext(schema: RankSchema, ids?: number[]) {
  const [gm, rbac, profiles, suspensions] = await Promise.all([
    getGmLevels(ids),
    getRbacRanks(schema, ids),
    queryCms<ProfileRow>(ids ? `SELECT * FROM cms_staff_profiles WHERE account_id IN (${ph(ids.length)})` : 'SELECT * FROM cms_staff_profiles', ids ?? []),
    queryCms<SuspensionRow>(
      `SELECT * FROM cms_staff_suspensions
       WHERE ${ids ? `account_id IN (${ph(ids.length)}) AND ` : ''}
             ((status = 'vigente' AND ends_at > NOW()) OR (scope = 'juego' AND restored_at IS NULL AND prev_gmlevel > 0))
       ORDER BY starts_at DESC`, ids ?? []
    ),
  ])
  return { gm, rbac, profiles: new Map(profiles.map(p => [Number(p.account_id), p])), suspensions }
}

function assertReadable(schema: RankSchema) {
  if (!schema.accountAccess.ok) {
    throw new StaffDataError(`No se pudo leer acore_auth.account_access: ${schema.accountAccess.error}`)
  }
}

/** Every account with an effective staff level, plus former members (retired / without permissions). */
export async function listStaff() {
  let schema: RankSchema
  try { schema = await getRankSchema() } catch (err) {
    throw new StaffDataError(`No se pudo inspeccionar el esquema de AzerothCore: ${sqlError(err)}`)
  }
  assertReadable(schema)
  let ctx: Awaited<ReturnType<typeof loadContext>>
  try { ctx = await loadContext(schema) } catch (err) {
    throw new StaffDataError(`Error al consultar el staff: ${sqlError(err)}`)
  }

  const staffIds = new Set<number>([...ctx.gm.keys(), ...ctx.rbac.keys()])
  for (const s of ctx.suspensions) {
    const p = ctx.profiles.get(Number(s.account_id))
    if (p?.status === 'activo') staffIds.add(Number(s.account_id))
  }
  const formerIds = [...ctx.profiles.keys()].filter(id => !staffIds.has(id))

  const all = await buildMembers([...staffIds, ...formerIds], ctx)
  const members = all.filter(m => staffIds.has(m.id))
    .sort((a, b) => (rankByKey(b.rank)?.order ?? 0) - (rankByKey(a.rank)?.order ?? 0) || b.gmlevel - a.gmlevel || a.username.localeCompare(b.username))
  const former = all.filter(m => !staffIds.has(m.id)).sort((a, b) => a.username.localeCompare(b.username))

  const [[divs], [warns]] = await Promise.all([
    queryCms<{ n: number }>('SELECT COUNT(*) AS n FROM cms_staff_divisions WHERE active = 1').then(r => [r[0]]),
    queryCms<{ n: number }>(`SELECT COUNT(*) AS n FROM cms_staff_warnings WHERE status = 'vigente'`).then(r => [r[0]]),
  ])
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  return {
    schema: diagnostics(schema, members.length),
    stats: {
      total: members.length,
      active: members.filter(m => m.status === 'activo').length,
      suspended: members.filter(m => m.status === 'suspendido' || m.status === 'pendiente_restauracion').length,
      divisions: Number(divs?.n ?? 0),
      activeWarnings: Number(warns?.n ?? 0),
      newThisMonth: members.filter(m => m.joinedAt && new Date(m.joinedAt) >= monthStart).length,
    },
    members,
    former,
  }
}

/** Plain-language summary of which sources were used (shown on the page). */
export function diagnostics(schema: RankSchema, count?: number) {
  const r = schema.rbac
  return {
    checkedAt: schema.checkedAt,
    accountAccess: schema.accountAccess.ok ? 'ok' : schema.accountAccess.error,
    rbac: r.accountPerms
      ? (r.permissions
        ? `rbac_account_permissions (${r.accountPerms.account}, ${r.accountPerms.permission}) · rangos registrados: ${r.registered.length}/10`
        : 'rbac_account_permissions existe, pero falta rbac_permissions: los rangos RBAC no se pueden verificar y se ignoran')
      : 'Sin tablas RBAC: este servidor usa solo account_access (AzerothCore estándar). Los rangos internos se guardan en el expediente del CMS.',
    rbacWritable: schema.rbacWritable,
    registered: r.registered,
    linked: !!r.linked,
    errors: r.errors,
    count,
  }
}

export async function getMembers(ids: number[]) {
  const schema = await getRankSchema()
  assertReadable(schema)
  const ctx = await loadContext(schema, ids)
  return buildMembers(ids, ctx)
}

export async function getMember(id: number): Promise<StaffMember | null> {
  const [m] = await getMembers([id])
  return m ?? null
}

// ── Expediente ──────────────────────────────────────────────────────────────

export async function getStaffFile(id: number) {
  const schema = await getRankSchema()
  assertReadable(schema)
  const member = await getMember(id)
  if (!member) return null

  const [
    account, accessRows, rbacRows, rankHistory, warnings, suspensions, divisions, activity, legacy, ticketStats, gmActions,
    recentTickets, recentActions, profile, banned,
  ] = await Promise.all([
    queryAuth<{ joindate: Date; last_ip: string | null; expansion: number; locked: number }>('SELECT joindate, last_ip, expansion, locked FROM account WHERE id = ?', [id]).then(r => r[0]),
    getAccountAccessRows(id),
    getAccountRbacRows(schema, id),
    queryCms<Record<string, unknown>>(
      `SELECT h.id, h.created_at, h.operation, h.old_rank_key, h.new_rank_key, h.old_gmlevel, h.new_gmlevel,
              h.old_rbac_name, h.new_rbac_name, h.reason, h.result, h.admin_account_id
       FROM cms_staff_rank_history h WHERE h.target_account_id = ? ORDER BY h.created_at DESC, h.id DESC LIMIT 100`, [id]),
    queryCms<{ id: number; type: WarningType; reason: string; description: string | null; issued_by: number; issued_at: Date; status: WarningStatus; status_changed_by: number | null; status_changed_at: Date | null; status_note: string | null }>(
      'SELECT * FROM cms_staff_warnings WHERE account_id = ? ORDER BY issued_at DESC, id DESC', [id]),
    queryCms<SuspensionRow>('SELECT * FROM cms_staff_suspensions WHERE account_id = ? ORDER BY starts_at DESC, id DESC', [id]),
    queryCms<{ id: number; division_id: number; name: string; color: string; division_active: number; role: DivisionRole; reason: string; assigned_at: Date; assigned_by: number; active: number; removed_at: Date | null; removed_by: number | null; removed_reason: string | null }>(
      `SELECT m.id, m.division_id, d.name, d.color, d.active AS division_active, m.role, m.reason, m.assigned_at, m.assigned_by,
              m.active, m.removed_at, m.removed_by, m.removed_reason
       FROM cms_staff_division_members m JOIN cms_staff_divisions d ON d.id = m.division_id
       WHERE m.account_id = ? ORDER BY m.active DESC, m.assigned_at DESC`, [id]),
    queryCms<{ id: number; created_at: Date; action: string; actor_name: string; reason: string | null; details: string | null; result: string; reference: string | null }>(
      'SELECT id, created_at, action, actor_name, reason, details, result, reference FROM cms_staff_activity WHERE target_account_id = ? ORDER BY id DESC LIMIT 200', [id]),
    queryCms<{ id: number; created_at: Date; action: string; details: string; directivo_account_id: number }>(
      'SELECT id, created_at, action, details, directivo_account_id FROM cms_directivos_logs WHERE target_account_id = ? ORDER BY id DESC LIMIT 50', [id]).catch(() => []),
    queryCms<{ attended: number; resolved: number; pending: number }>(
      `SELECT
         (SELECT COUNT(*) FROM cms_tickets WHERE assigned_to = ?) AS attended,
         (SELECT COUNT(*) FROM cms_tickets WHERE closed_by = ? AND status = 'Cerrado') AS resolved,
         (SELECT COUNT(*) FROM cms_tickets WHERE assigned_to = ? AND status IN ('Aceptado','En Revisión')) AS pending`, [id, id, id]).then(r => r[0]),
    queryCms<{ total: number; sanctions: number }>(
      `SELECT (SELECT COUNT(*) FROM cms_gm_logs WHERE gm_account_id = ?) AS total,
              (SELECT COUNT(*) FROM cms_gm_sanctions WHERE gm_account_id = ?) AS sanctions`, [id, id]).then(r => r[0]),
    queryCms<{ id: number; subject: string; status: string; priority: string; created_at: Date; assigned_at: Date | null; closed_at: Date | null }>(
      'SELECT id, subject, status, priority, created_at, assigned_at, closed_at FROM cms_tickets WHERE assigned_to = ? OR closed_by = ? ORDER BY COALESCE(closed_at, assigned_at, created_at) DESC LIMIT 20', [id, id]),
    queryCms<{ id: number; created_at: Date; action: string; target_account_id: number | null; target_character: string | null; reason: string | null; result: string | null; details: string | null }>(
      'SELECT id, created_at, action, target_account_id, target_character, reason, result, details FROM cms_gm_logs WHERE gm_account_id = ? ORDER BY id DESC LIMIT 30', [id]),
    queryCms<ProfileRow>('SELECT * FROM cms_staff_profiles WHERE account_id = ?', [id]).then(r => r[0] ?? null),
    queryAuth<{ n: number }>(
      'SELECT COUNT(*) AS n FROM account_banned WHERE id = ? AND active = 1 AND (unbandate = bandate OR unbandate > UNIX_TIMESTAMP())', [id]
    ).then(r => Number(r[0]?.n ?? 0) > 0).catch(() => null),
  ])

  const names = await fetchNames([
    ...warnings.flatMap(w => [w.issued_by, w.status_changed_by]),
    ...suspensions.flatMap(s => [s.created_by, s.lifted_by, s.restored_by]),
    ...divisions.flatMap(d => [d.assigned_by, d.removed_by]),
    ...rankHistory.map(h => Number(h.admin_account_id)),
    ...legacy.map(l => l.directivo_account_id),
    profile?.retired_by,
  ])
  const nm = (v: number | null | undefined) => (v ? names.get(v) ?? `#${v}` : null)

  const rank = rankByKey(member.rank)
  const linked = rank && schema.rbac.linked ? await getLinkedPermissions(schema, rank.rbacId).catch(() => null) : null

  return {
    member,
    account: { ...account, banned },
    profile: profile ? { ...profile, retiredByName: nm(profile.retired_by) } : null,
    access: {
      accountAccess: accessRows,
      rbacRows,
      linked,
      rbacAvailable: !!schema.rbac.accountPerms,
      rbacWritable: schema.rbacWritable,
      registered: schema.rbac.registered,
    },
    stats: {
      ticketsAttended: Number(ticketStats?.attended ?? 0),
      ticketsResolved: Number(ticketStats?.resolved ?? 0),
      ticketsPending: Number(ticketStats?.pending ?? 0),
      gmActions: Number(gmActions?.total ?? 0),
      sanctionsApplied: Number(gmActions?.sanctions ?? 0),
      warningsActive: warnings.filter(w => w.status === 'vigente').length,
      warningsTotal: warnings.length,
      adminSanctions: suspensions.length,
    },
    rankHistory: rankHistory.map(h => ({ ...h, adminName: nm(Number(h.admin_account_id)) })),
    warnings: warnings.map(w => ({ ...w, issuedByName: nm(w.issued_by), statusChangedByName: nm(w.status_changed_by) })),
    suspensions: suspensions.map(s => ({
      ...s,
      state: suspensionState(s),
      createdByName: nm(s.created_by), liftedByName: nm(s.lifted_by), restoredByName: nm(s.restored_by),
      prevRankName: rankByKey(s.prev_rank_key)?.name ?? null,
    })),
    divisions: divisions.map(d => ({ ...d, assignedByName: nm(d.assigned_by), removedByName: nm(d.removed_by) })),
    activity,
    legacyLogs: legacy.map(l => ({ ...l, directivoName: nm(l.directivo_account_id) })),
    recentTickets,
    recentActions,
  }
}

// ── Rendimiento ─────────────────────────────────────────────────────────────

export type Period = 'day' | 'week' | 'month'
export function periodStart(p: Period): Date {
  const d = new Date()
  if (p === 'day') d.setHours(0, 0, 0, 0)
  else if (p === 'week') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0) }
  else { d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0) }
  return d
}

export async function getPerformance(f: { period: Period; division?: number; member?: number; rank?: RankKey }) {
  const { members } = await listStaff()
  let list = members
  if (f.member) list = list.filter(m => m.id === f.member)
  if (f.rank) list = list.filter(m => m.rank === f.rank)
  if (f.division) list = list.filter(m => m.divisions.some(d => d.id === f.division))
  const ids = list.map(m => m.id)
  const start = periodStart(f.period)
  if (!ids.length) return { period: f.period, since: start, rows: [] }

  const inIds = `IN (${ph(ids.length)})`
  const [accepted, resolved, pending, firstReply, sanctions, actions] = await Promise.all([
    queryCms<{ gm: number; n: number }>(`SELECT assigned_to AS gm, COUNT(*) AS n FROM cms_tickets WHERE assigned_at >= ? AND assigned_to ${inIds} GROUP BY assigned_to`, [start, ...ids]),
    queryCms<{ gm: number; n: number }>(`SELECT closed_by AS gm, COUNT(*) AS n FROM cms_tickets WHERE status = 'Cerrado' AND closed_at >= ? AND closed_by ${inIds} GROUP BY closed_by`, [start, ...ids]),
    queryCms<{ gm: number; n: number }>(`SELECT assigned_to AS gm, COUNT(*) AS n FROM cms_tickets WHERE status IN ('Aceptado','En Revisión') AND assigned_to ${inIds} GROUP BY assigned_to`, ids),
    queryCms<{ gm: number; avg_s: number; n: number }>(
      `SELECT r.author_id AS gm, AVG(TIMESTAMPDIFF(SECOND, t.created_at, r.created_at)) AS avg_s, COUNT(*) AS n
       FROM cms_ticket_replies r JOIN cms_tickets t ON t.id = r.ticket_id
       WHERE r.is_gm = 1 AND r.is_system = 0 AND r.created_at >= ? AND r.author_id ${inIds}
         AND r.id = (SELECT MIN(r2.id) FROM cms_ticket_replies r2 WHERE r2.ticket_id = r.ticket_id AND r2.is_gm = 1 AND r2.is_system = 0)
       GROUP BY r.author_id`, [start, ...ids]),
    queryCms<{ gm: number; n: number }>(`SELECT gm_account_id AS gm, COUNT(*) AS n FROM cms_gm_sanctions WHERE starts_at >= ? AND gm_account_id ${inIds} GROUP BY gm_account_id`, [start, ...ids]),
    queryCms<{ gm: number; n: number }>(`SELECT gm_account_id AS gm, COUNT(*) AS n FROM cms_gm_logs WHERE created_at >= ? AND gm_account_id ${inIds} GROUP BY gm_account_id`, [start, ...ids]),
  ])
  const get = (rows: Array<{ gm: number; n: number }>, id: number) => Number(rows.find(r => Number(r.gm) === id)?.n ?? 0)

  return {
    period: f.period,
    since: start,
    rows: list.map(m => {
      const fr = firstReply.find(r => Number(r.gm) === m.id)
      return {
        id: m.id,
        username: m.username,
        rank: m.rank,
        status: m.status,
        divisions: m.divisions,
        joinedAt: m.joinedAt,
        warnings: m.warnings,
        ticketsAccepted: get(accepted, m.id),
        ticketsResolved: get(resolved, m.id),
        ticketsPending: get(pending, m.id),
        firstResponseSeconds: fr ? Math.round(Number(fr.avg_s)) : null,
        firstResponseSample: fr ? Number(fr.n) : 0,
        sanctions: get(sanctions, m.id),
        actions: get(actions, m.id),
      }
    }),
  }
}

// ── Historial ───────────────────────────────────────────────────────────────

export async function getActivity(f: { q?: string; actor?: string; action?: string; from?: string; to?: string; page: number }) {
  const where: string[] = []
  const params: unknown[] = []
  if (f.q) {
    if (/^\d+$/.test(f.q)) { where.push('(target_account_id = ? OR target_name LIKE ?)'); params.push(Number(f.q), `%${f.q}%`) }
    else { where.push('(target_name LIKE ? OR reason LIKE ? OR details LIKE ?)'); params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`) }
  }
  if (f.actor) { where.push('actor_name LIKE ?'); params.push(`%${f.actor}%`) }
  if (f.action) { where.push('action = ?'); params.push(f.action) }
  if (f.from) { where.push('created_at >= ?'); params.push(`${f.from} 00:00:00`) }
  if (f.to) { where.push('created_at <= ?'); params.push(`${f.to} 23:59:59`) }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const pageSize = 50
  const [rows, total, actions] = await Promise.all([
    queryCms<Record<string, unknown>>(
      `SELECT id, created_at, target_account_id, target_name, actor_account_id, actor_name, action, reason, details, result, reference
       FROM cms_staff_activity ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (f.page - 1) * pageSize]),
    queryCms<{ n: number }>(`SELECT COUNT(*) AS n FROM cms_staff_activity ${w}`, params),
    queryCms<{ action: string }>('SELECT DISTINCT action FROM cms_staff_activity ORDER BY action'),
  ])
  return { rows, total: Number(total[0]?.n ?? 0), pageSize, actions: actions.map(a => a.action) }
}

// ── Divisiones ──────────────────────────────────────────────────────────────

export async function listDivisions() {
  const rows = await queryCms<{ id: number; slug: string; name: string; description: string; color: string; active: number; created_at: Date; members: number }>(
    `SELECT d.id, d.slug, d.name, d.description, d.color, d.active, d.created_at,
            (SELECT COUNT(*) FROM cms_staff_division_members m WHERE m.division_id = d.id AND m.active = 1) AS members
     FROM cms_staff_divisions d ORDER BY d.active DESC, d.id`
  )
  const leads = await queryCms<{ division_id: number; account_id: number; role: DivisionRole }>(
    `SELECT division_id, account_id, role FROM cms_staff_division_members WHERE active = 1 AND role IN ('responsable','subresponsable')`
  )
  const names = await fetchNames(leads.map(l => l.account_id))
  return rows.map(d => ({
    ...d,
    active: !!d.active,
    members: Number(d.members),
    leads: leads.filter(l => l.division_id === d.id).map(l => ({ accountId: l.account_id, username: names.get(l.account_id) ?? `#${l.account_id}`, role: l.role })),
  }))
}

export async function getDivision(id: number) {
  const [division] = await queryCms<{ id: number; slug: string; name: string; description: string; color: string; active: number; created_at: Date; created_by: number | null }>(
    'SELECT * FROM cms_staff_divisions WHERE id = ?', [id]
  )
  if (!division) return null
  const rows = await queryCms<{ id: number; account_id: number; role: DivisionRole; reason: string; assigned_at: Date; assigned_by: number; active: number; removed_at: Date | null; removed_by: number | null; removed_reason: string | null }>(
    'SELECT * FROM cms_staff_division_members WHERE division_id = ? ORDER BY active DESC, FIELD(role,\'responsable\',\'subresponsable\',\'supervisor\',\'miembro\',\'en_formacion\'), assigned_at DESC', [id]
  )
  const names = await fetchNames(rows.flatMap(r => [r.account_id, r.assigned_by, r.removed_by]).concat(division.created_by ?? []))
  const nm = (v: number | null) => (v ? names.get(v) ?? `#${v}` : null)
  return {
    ...division,
    active: !!division.active,
    createdByName: nm(division.created_by),
    members: rows.filter(r => r.active).map(r => ({ ...r, username: nm(r.account_id), assignedByName: nm(r.assigned_by) })),
    history: rows.map(r => ({ ...r, username: nm(r.account_id), assignedByName: nm(r.assigned_by), removedByName: nm(r.removed_by) })),
  }
}
