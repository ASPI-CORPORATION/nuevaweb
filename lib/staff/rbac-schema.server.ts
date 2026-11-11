/**
 * Detects how ranks are really stored on THIS AzerothCore server instead of assuming it.
 *
 * - account_access (id, gmlevel, RealmID[, comment]) exists in every AzerothCore.
 * - Stock AzerothCore has NO rbac_* tables (RBAC is a TrinityCore system). Some servers add
 *   them by hand, either with TrinityCore column names (accountId, permissionId, realmId) or
 *   with other names. Hard-coding one layout made the old staff query fail and the page show
 *   "STAFF (0)", so every RBAC query here is built from the columns actually found.
 *
 * information_schema only lists tables the web user can access, so "missing" can also mean
 * "no privileges" — the diagnostics say so.
 */
import type { PoolConnection } from 'mysql2/promise'
import { queryAuth } from '@/lib/db'
import { RBAC_RANK_MAX, RBAC_RANK_MIN } from '@/lib/staff/ranks'

const AUTH_SCHEMA = process.env.DATABASE_AUTH || 'acore_auth'
export const REALM_ID = Number(process.env.REALM_ID || 1)

export interface RbacAccountCols { account: string; permission: string; granted: string | null; realm: string | null }

export interface RankSchema {
  checkedAt: string
  accountAccess: { ok: boolean; hasComment: boolean; error: string | null }
  rbac: {
    /** rbac_account_permissions found and readable, with resolved column names. */
    accountPerms: RbacAccountCols | null
    /** rbac_permissions found (needed to verify that a custom rank is registered). */
    permissions: { name: string | null } | null
    /** rbac_linked_permissions found (shows what a rank permission grants). */
    linked: { id: string; linked: string } | null
    /** Custom rank ids 90000–90009 registered in rbac_permissions. */
    registered: number[]
    errors: string[]
  }
  /** True when rank changes can also be written as RBAC rows. */
  rbacWritable: boolean
}

const pick = (cols: string[], candidates: string[]) => candidates.find(c => cols.includes(c)) ?? null
const q = (id: string) => `\`${id.replace(/`/g, '')}\``

let cache: { at: number; value: RankSchema } | null = null

export async function getRankSchema(force = false): Promise<RankSchema> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.value

  const value: RankSchema = {
    checkedAt: new Date().toISOString(),
    accountAccess: { ok: false, hasComment: false, error: null },
    rbac: { accountPerms: null, permissions: null, linked: null, registered: [], errors: [] },
    rbacWritable: false,
  }

  const rows = await queryAuth<{ t: string; c: string }>(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('account_access','rbac_account_permissions','rbac_permissions','rbac_linked_permissions')`,
    [AUTH_SCHEMA]
  )
  const cols = (t: string) => rows.filter(r => r.t === t).map(r => r.c)

  // account_access — required
  const aa = cols('account_access')
  if (!aa.length) {
    value.accountAccess.error = 'La tabla account_access no existe o el usuario de la web no tiene permiso para leerla.'
  } else {
    try {
      await queryAuth('SELECT id, gmlevel, RealmID FROM account_access LIMIT 1')
      value.accountAccess = { ok: true, hasComment: aa.includes('comment'), error: null }
    } catch (err) {
      value.accountAccess.error = sqlError(err)
    }
  }

  // rbac_account_permissions — optional, any known column layout
  const rap = cols('rbac_account_permissions')
  if (rap.length) {
    const account = pick(rap, ['accountId', 'id', 'account_id', 'account'])
    const permission = pick(rap, ['permissionId', 'permission', 'permission_id'])
    if (!account || !permission) {
      value.rbac.errors.push(`rbac_account_permissions tiene columnas no reconocidas (${rap.join(', ')}).`)
    } else {
      const ap: RbacAccountCols = { account, permission, granted: pick(rap, ['granted']), realm: pick(rap, ['realmId', 'realm_id', 'RealmID']) }
      try {
        await queryAuth(`SELECT ${q(ap.account)}, ${q(ap.permission)} FROM rbac_account_permissions LIMIT 1`)
        value.rbac.accountPerms = ap
      } catch (err) {
        value.rbac.errors.push(`rbac_account_permissions: ${sqlError(err)}`)
      }
    }
  }

  const rp = cols('rbac_permissions')
  if (rp.length && rp.includes('id')) {
    try {
      const reg = await queryAuth<{ id: number }>(
        'SELECT id FROM rbac_permissions WHERE id BETWEEN ? AND ?', [RBAC_RANK_MIN, RBAC_RANK_MAX]
      )
      value.rbac.permissions = { name: rp.includes('name') ? 'name' : null }
      value.rbac.registered = reg.map(r => Number(r.id)).sort()
    } catch (err) {
      value.rbac.errors.push(`rbac_permissions: ${sqlError(err)}`)
    }
  }

  const rl = cols('rbac_linked_permissions')
  if (rl.length) {
    const id = pick(rl, ['id'])
    const linked = pick(rl, ['linkedId', 'linked_id', 'linked'])
    if (id && linked) {
      try {
        await queryAuth(`SELECT ${q(id)}, ${q(linked)} FROM rbac_linked_permissions LIMIT 1`)
        value.rbac.linked = { id, linked }
      } catch (err) {
        value.rbac.errors.push(`rbac_linked_permissions: ${sqlError(err)}`)
      }
    }
  }

  value.rbacWritable = !!value.rbac.accountPerms && !!value.rbac.permissions
  cache = { at: Date.now(), value }
  return value
}

export function sqlError(err: unknown): string {
  const e = err as { code?: string; sqlMessage?: string; message?: string }
  return e?.sqlMessage ? `${e.code ?? 'ERROR'}: ${e.sqlMessage}` : (e?.message ?? String(err))
}

/** Realm filter fragment for rbac_account_permissions (if the table has a realm column). */
function realmFilter(ap: RbacAccountCols, alias: string) {
  return ap.realm ? ` AND ${alias}.${q(ap.realm)} IN (-1, ${REALM_ID})` : ''
}
function grantedFilter(ap: RbacAccountCols, alias: string) {
  return ap.granted ? ` AND ${alias}.${q(ap.granted)} = 1` : ''
}

/**
 * Highest REGISTERED custom rank permission per account. Empty map when the server has no
 * usable RBAC (never throws for missing tables — getRankSchema already reported it).
 */
export async function getRbacRanks(schema: RankSchema, accountIds?: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  const ap = schema.rbac.accountPerms
  if (!ap || !schema.rbac.registered.length) return out
  if (accountIds && !accountIds.length) return out
  const idFilter = accountIds ? ` AND r.${q(ap.account)} IN (${accountIds.map(() => '?').join(',')})` : ''
  const rows = await queryAuth<{ account: number; rank: number }>(
    `SELECT r.${q(ap.account)} AS account, MAX(r.${q(ap.permission)}) AS \`rank\`
     FROM rbac_account_permissions r
     WHERE r.${q(ap.permission)} IN (${schema.rbac.registered.join(',')})${grantedFilter(ap, 'r')}${realmFilter(ap, 'r')}${idFilter}
     GROUP BY r.${q(ap.account)}`,
    accountIds ?? []
  )
  for (const r of rows) out.set(Number(r.account), Number(r.rank))
  return out
}

/** All RBAC rows of one account (any permission), with names when available. */
export async function getAccountRbacRows(schema: RankSchema, accountId: number) {
  const ap = schema.rbac.accountPerms
  if (!ap) return []
  const nameJoin = schema.rbac.permissions?.name ? `LEFT JOIN rbac_permissions p ON p.id = r.${q(ap.permission)}` : ''
  return queryAuth<{ permission: number; granted: number; realm: number; name: string | null }>(
    `SELECT r.${q(ap.permission)} AS permission,
            ${ap.granted ? `r.${q(ap.granted)}` : '1'} AS granted,
            ${ap.realm ? `r.${q(ap.realm)}` : '-1'} AS realm,
            ${nameJoin ? 'p.name' : 'NULL'} AS name
     FROM rbac_account_permissions r ${nameJoin}
     WHERE r.${q(ap.account)} = ? ORDER BY r.${q(ap.permission)}`,
    [accountId]
  )
}

/** Permissions linked to a rank permission (what the rank grants, if the server defines it). */
export async function getLinkedPermissions(schema: RankSchema, permissionId: number) {
  const l = schema.rbac.linked
  if (!l) return null
  const nameJoin = schema.rbac.permissions?.name ? `LEFT JOIN rbac_permissions p ON p.id = l.${q(l.linked)}` : ''
  return queryAuth<{ id: number; name: string | null }>(
    `SELECT l.${q(l.linked)} AS id, ${nameJoin ? 'p.name' : 'NULL'} AS name
     FROM rbac_linked_permissions l ${nameJoin} WHERE l.${q(l.id)} = ? ORDER BY l.${q(l.linked)}`,
    [permissionId]
  )
}

/** Effective gmlevel per account for this realm (RealmID -1 or REALM_ID). */
export async function getGmLevels(accountIds?: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  if (accountIds && !accountIds.length) return out
  const idFilter = accountIds ? ` AND id IN (${accountIds.map(() => '?').join(',')})` : ' AND gmlevel > 0'
  const rows = await queryAuth<{ id: number; gmlevel: number }>(
    `SELECT id, MAX(gmlevel) AS gmlevel FROM account_access WHERE RealmID IN (-1, ?)${idFilter} GROUP BY id`,
    [REALM_ID, ...(accountIds ?? [])]
  )
  for (const r of rows) out.set(Number(r.id), Number(r.gmlevel))
  return out
}

export async function getAccountAccessRows(accountId: number) {
  return queryAuth<{ gmlevel: number; RealmID: number }>(
    'SELECT gmlevel, RealmID FROM account_access WHERE id = ? ORDER BY RealmID', [accountId]
  )
}

type Exec = Pick<PoolConnection, 'execute'>

/**
 * Writes a rank to the game inside the caller's transaction (CMS pool connection, so the
 * auth and CMS writes commit or roll back together).
 *
 * account_access: same semantics as AzerothCore's `.account set gmlevel <acc> <lvl> -1`
 * (removes every realm row, then inserts RealmID -1). gmlevel null = remove access.
 * RBAC: replaces only the custom rank permissions 90000–90009; other RBAC rows are kept.
 */
export async function writeGameRank(conn: Exec, schema: RankSchema, accountId: number, gmlevel: number | null, rbacId: number | null, comment: string) {
  const authDb = q(AUTH_SCHEMA)
  await conn.execute(`DELETE FROM ${authDb}.account_access WHERE id = ?`, [accountId] as never)
  if (gmlevel && gmlevel > 0) {
    if (schema.accountAccess.hasComment) {
      await conn.execute(`INSERT INTO ${authDb}.account_access (id, gmlevel, RealmID, comment) VALUES (?, ?, -1, ?)`, [accountId, gmlevel, comment.slice(0, 255)] as never)
    } else {
      await conn.execute(`INSERT INTO ${authDb}.account_access (id, gmlevel, RealmID) VALUES (?, ?, -1)`, [accountId, gmlevel] as never)
    }
  }
  const ap = schema.rbac.accountPerms
  if (ap && schema.rbacWritable) {
    await conn.execute(
      `DELETE FROM ${authDb}.rbac_account_permissions WHERE ${q(ap.account)} = ? AND ${q(ap.permission)} BETWEEN ? AND ?`,
      [accountId, RBAC_RANK_MIN, RBAC_RANK_MAX] as never)
    if (rbacId != null && schema.rbac.registered.includes(rbacId)) {
      const cols = [ap.account, ap.permission, ...(ap.granted ? [ap.granted] : []), ...(ap.realm ? [ap.realm] : [])]
      const vals = [accountId, rbacId, ...(ap.granted ? [1] : []), ...(ap.realm ? [-1] : [])]
      await conn.execute(
        `INSERT INTO ${authDb}.rbac_account_permissions (${cols.map(q).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        vals as never)
    }
  }
}

/** How many accounts hold the Owner rank via RBAC (for last-Owner protection). */
export async function countRbacOwners(schema: RankSchema): Promise<number> {
  const ap = schema.rbac.accountPerms
  if (!ap || !schema.rbac.registered.includes(RBAC_RANK_MAX)) return 0
  const [row] = await queryAuth<{ c: number }>(
    `SELECT COUNT(DISTINCT r.${q(ap.account)}) AS c FROM rbac_account_permissions r
     WHERE r.${q(ap.permission)} = ${RBAC_RANK_MAX}${grantedFilter(ap, 'r')}${realmFilter(ap, 'r')}`
  )
  return Number(row?.c ?? 0)
}

