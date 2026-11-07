/**
 * Web roles for WoW Argentina — pure, client-safe module (no DB access).
 *
 * The effective role is resolved from three independent sources and the
 * highest one wins:
 *   1. acore_auth.account_access.gmlevel (native AzerothCore 0-3, legacy 10 = Directivo)
 *   2. Custom RBAC rank 90000-90009 in rbac_account_permissions — only counted when
 *      the permission is registered in rbac_permissions (verified server-side)
 *   3. DIRECTIVOS_ACCOUNT_IDS env var (server-only break-glass, no DB change needed)
 */

export type WebRole = 'user' | 'gm' | 'admin' | 'directivo'

export const ROLE_RANK: Record<WebRole, number> = { user: 0, gm: 1, admin: 2, directivo: 3 }

export const ROLE_LABEL: Record<WebRole, string> = {
  user: 'Jugador',
  gm: 'Game Master',
  admin: 'Administrador',
  directivo: 'Directivo',
}

/** Legacy web convention kept for backwards compatibility with existing accounts. */
export const LEGACY_DIRECTIVO_GMLEVEL = 10

export type AccessSource = 'gmlevel' | 'rbac' | 'env'

export interface AccessInfo {
  gmlevel: number
  rbacRankId: number | null
  role: WebRole
  sources: AccessSource[]
}

export function hasRole(role: WebRole | null | undefined, min: WebRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export function maxRole(a: WebRole, b: WebRole): WebRole {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b
}

/** Native AzerothCore: 0 player, 1 moderator, 2 gamemaster, 3 administrator, 4 console. */
export function roleFromGmLevel(gmlevel: number): WebRole {
  if (gmlevel >= LEGACY_DIRECTIVO_GMLEVEL) return 'directivo'
  if (gmlevel >= 3) return 'admin'
  if (gmlevel >= 2) return 'gm'
  return 'user'
}

/**
 * Custom RBAC ranks → web role. Least privilege: only Owner / Co-Owner are Directivos,
 * only Administrador is Admin, Game Master..Developer get the GM panel.
 */
export function roleFromRbacRank(rankId: number | null | undefined): WebRole {
  if (rankId == null) return 'user'
  if (rankId >= 90008 && rankId <= 90009) return 'directivo'
  if (rankId === 90007) return 'admin'
  if (rankId >= 90002 && rankId <= 90006) return 'gm'
  return 'user'
}

export function resolveRole(input: { gmlevel: number; rbacRankId: number | null; envDirectivo: boolean }): AccessInfo {
  const sources: AccessSource[] = []
  let role: WebRole = 'user'

  const fromGm = roleFromGmLevel(input.gmlevel)
  if (fromGm !== 'user') { role = maxRole(role, fromGm); sources.push('gmlevel') }

  const fromRbac = roleFromRbacRank(input.rbacRankId)
  if (fromRbac !== 'user') { role = maxRole(role, fromRbac); sources.push('rbac') }

  if (input.envDirectivo) { role = 'directivo'; sources.push('env') }

  return { gmlevel: input.gmlevel, rbacRankId: input.rbacRankId, role, sources }
}

/** Maps the old numeric thresholds used across the codebase (2 / 3 / 10) to roles. */
export function roleForMinGmLevel(minLevel: number): WebRole {
  if (minLevel >= LEGACY_DIRECTIVO_GMLEVEL) return 'directivo'
  if (minLevel >= 3) return 'admin'
  if (minLevel >= 2) return 'gm'
  return 'user'
}

export function parseAccountIdList(raw: string | undefined): Set<number> {
  const ids = new Set<number>()
  for (const part of (raw ?? '').split(',')) {
    const n = Number(part.trim())
    if (Number.isInteger(n) && n > 0) ids.add(n)
  }
  return ids
}
