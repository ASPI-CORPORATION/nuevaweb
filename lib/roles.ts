/**
 * Web roles for WoW Argentina — pure, client-safe module (no DB access).
 *
 * - GM / Admin come from the game's own permissions (highest wins):
 *     acore_auth.account_access.gmlevel (native 0-3) and the custom RBAC ranks
 *     90000-90009 (only when registered in rbac_permissions, verified server-side).
 * - Directivo comes ONLY from wowargentina_cms.wowargentina_directivos (active row).
 *   gmlevel and RBAC never grant access to /directivos, and being a Directivo never
 *   grants anything inside the game: the two permission systems are independent.
 */

export type WebRole = 'user' | 'gm' | 'admin' | 'directivo'

export const ROLE_RANK: Record<WebRole, number> = { user: 0, gm: 1, admin: 2, directivo: 3 }

export const ROLE_LABEL: Record<WebRole, string> = {
  user: 'Jugador',
  gm: 'Game Master',
  admin: 'Administrador',
  directivo: 'Directivo',
}

export type DirectivoRank = 'propietario' | 'directivo'

export const DIRECTIVO_RANK_LABEL: Record<DirectivoRank, string> = {
  propietario: 'Máxima Autoridad',
  directivo: 'Directivo',
}

/** Account that the bootstrap migration registers as Propietario; never removable from the panel. */
export const OWNER_ACCOUNT_ID = 1

export type AccessSource = 'gmlevel' | 'rbac' | 'directivos'

export interface DirectivoMembership {
  rank: DirectivoRank
  name: string
}

export interface AccessInfo {
  gmlevel: number
  rbacRankId: number | null
  directivo: DirectivoMembership | null
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
  if (gmlevel >= 3) return 'admin'
  if (gmlevel >= 1) return 'gm'
  return 'user'
}

/**
 * Custom RBAC ranks → web role (never Directivo). Least privilege:
 * Administrador / Co-Owner / Owner → Admin, Ayudante..Developer → GM panel.
 */
export function roleFromRbacRank(rankId: number | null | undefined): WebRole {
  if (rankId == null) return 'user'
  if (rankId >= 90007 && rankId <= 90009) return 'admin'
  if (rankId >= 90000 && rankId <= 90006) return 'gm'
  return 'user'
}

export function resolveRole(input: {
  gmlevel: number
  rbacRankId: number | null
  directivo: DirectivoMembership | null
}): AccessInfo {
  const sources: AccessSource[] = []
  let role: WebRole = 'user'

  const fromGm = roleFromGmLevel(input.gmlevel)
  if (fromGm !== 'user') { role = maxRole(role, fromGm); sources.push('gmlevel') }

  const fromRbac = roleFromRbacRank(input.rbacRankId)
  if (fromRbac !== 'user') { role = maxRole(role, fromRbac); sources.push('rbac') }

  if (input.directivo) { role = 'directivo'; sources.push('directivos') }

  return { gmlevel: input.gmlevel, rbacRankId: input.rbacRankId, directivo: input.directivo, role, sources }
}

/** Maps the old numeric thresholds used across the codebase (2 / 3 / 10) to roles. */
export function roleForMinGmLevel(minLevel: number): WebRole {
  if (minLevel >= 10) return 'directivo'
  if (minLevel >= 3) return 'admin'
  if (minLevel >= 2) return 'gm'
  return 'user'
}

export function isOwner(access: Pick<AccessInfo, 'directivo'> | null | undefined): boolean {
  return access?.directivo?.rank === 'propietario'
}
