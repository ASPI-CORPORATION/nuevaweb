/**
 * GM panel tiers and capability matrix — pure, client-safe.
 *
 * Tier sources (highest wins, all verified server-side on every request):
 *   - acore_auth.account_access.gmlevel for RealmID -1 or REALM_ID: 1 → 1, 2 → 2, ≥3 → 3
 *   - custom RBAC rank (only if registered in rbac_permissions), see tierFromRbacRank
 *   - active Directivo membership → 3 (Directivos keep full GM tooling; their own panel
 *     and table are untouched and never managed from /gm)
 */

export type GmTier = 0 | 1 | 2 | 3

export const GM_TIER_LABEL: Record<GmTier, string> = {
  0: 'Jugador',
  1: 'GM Nivel 1 · Soporte',
  2: 'GM Nivel 2 · Moderador',
  3: 'GM Nivel 3 · Administrador',
}

export const GM_TIER_SHORT: Record<GmTier, string> = { 0: 'Jugador', 1: 'GM 1', 2: 'GM 2', 3: 'GM 3' }

export function tierFromGmLevel(gmlevel: number): GmTier {
  if (gmlevel >= 3) return 3
  if (gmlevel === 2) return 2
  if (gmlevel === 1) return 1
  return 0
}

/** WoW Argentina custom RBAC ranks 90000-90009 → GM tier. */
export function tierFromRbacRank(rankId: number | null | undefined): GmTier {
  switch (rankId) {
    case 90000: return 1 // Ayudante
    case 90006: return 1 // Developer: support tooling only
    case 90001: // Moderador
    case 90002: // Game Master
    case 90003: return 2 // GM Senior
    case 90004: // Supervisor GM
    case 90005: // Head GM
    case 90007: // Administrador
    case 90008: // Co-Owner
    case 90009: return 3 // Owner
    default: return 0
  }
}

export function resolveGmTier(input: { gmlevel: number; rbacRankId: number | null; isDirectivo: boolean }): GmTier {
  const t = Math.max(tierFromGmLevel(input.gmlevel), tierFromRbacRank(input.rbacRankId), input.isDirectivo ? 3 : 0)
  return t as GmTier
}

/** Minimum tier for each capability (matrix requested for WoW Argentina). */
export const GM_CAPS = {
  viewAccounts: 1,
  viewCharacters: 1,
  viewSanctions: 1,
  viewTickets: 1,
  replyTickets: 1,
  manageTickets: 1,
  unstuck: 1,
  teleport: 1,
  serverStatus: 1,
  onlinePlayers: 1,
  viewPiiMasked: 2,
  viewPiiFull: 3,
  banAccountTemp: 2,
  banAccountPerm: 3,
  banCharacterTemp: 2,
  banCharacterPerm: 3,
  unbanOwn: 2,
  unbanAny: 3,
  mute: 2,
  kick: 2,
  auditPartial: 2,
  auditFull: 3,
  staffSupervision: 3,
  manageTemplates: 3,
  reassignTickets: 3,
} as const

export type GmCap = keyof typeof GM_CAPS

export function can(tier: GmTier, cap: GmCap): boolean {
  return tier >= GM_CAPS[cap]
}

export const SANCTION_DURATIONS = [
  { key: '30m', label: '30 minutos', minutes: 30 },
  { key: '1h', label: '1 hora', minutes: 60 },
  { key: '6h', label: '6 horas', minutes: 360 },
  { key: '12h', label: '12 horas', minutes: 720 },
  { key: '1d', label: '1 día', minutes: 1440 },
  { key: '3d', label: '3 días', minutes: 4320 },
  { key: '7d', label: '7 días', minutes: 10080 },
  { key: '30d', label: '30 días', minutes: 43200 },
  { key: 'perm', label: 'Permanente', minutes: -1 },
] as const

export type SanctionDuration = (typeof SANCTION_DURATIONS)[number]['key']

export function durationInfo(key: string) {
  return SANCTION_DURATIONS.find(d => d.key === key) ?? null
}
