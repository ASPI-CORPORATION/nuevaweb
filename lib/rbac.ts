/**
 * Custom RBAC ranks for WoW Argentina (IDs 90000–90009).
 * These rows must exist in acore_auth.rbac_permissions before this code runs.
 * Assignment is stored in rbac_account_permissions (id, permission, granted=1, realm_id=-1).
 *
 * AzerothCore loads RBAC at session start and caches it in memory.
 * Changes to rbac_account_permissions take effect the NEXT TIME
 * the target account logs in — they are NOT applied to active sessions.
 */

export const CUSTOM_RBAC_RANKS = {
  90000: { id: 90000, name: 'Ayudante',      level: 0, color: '#94a3b8', badgeBg: 'rgba(148,163,184,0.1)', badgeBorder: 'rgba(148,163,184,0.25)' },
  90001: { id: 90001, name: 'Moderador',     level: 1, color: '#60a5fa', badgeBg: 'rgba(96,165,250,0.1)',  badgeBorder: 'rgba(96,165,250,0.25)'  },
  90002: { id: 90002, name: 'Game Master',   level: 2, color: '#4ade80', badgeBg: 'rgba(74,222,128,0.1)', badgeBorder: 'rgba(74,222,128,0.25)'  },
  90003: { id: 90003, name: 'GM Senior',     level: 3, color: '#34d399', badgeBg: 'rgba(52,211,153,0.1)', badgeBorder: 'rgba(52,211,153,0.25)'  },
  90004: { id: 90004, name: 'Supervisor GM', level: 4, color: '#22d3ee', badgeBg: 'rgba(34,211,238,0.1)', badgeBorder: 'rgba(34,211,238,0.25)'  },
  90005: { id: 90005, name: 'Head GM',       level: 5, color: '#a78bfa', badgeBg: 'rgba(167,139,250,0.1)',badgeBorder: 'rgba(167,139,250,0.25)' },
  90006: { id: 90006, name: 'Developer',     level: 6, color: '#f472b6', badgeBg: 'rgba(244,114,182,0.1)',badgeBorder: 'rgba(244,114,182,0.25)' },
  90007: { id: 90007, name: 'Administrador', level: 7, color: '#fb923c', badgeBg: 'rgba(251,146,60,0.1)', badgeBorder: 'rgba(251,146,60,0.25)'  },
  90008: { id: 90008, name: 'Co-Owner',      level: 8, color: '#fbbf24', badgeBg: 'rgba(251,191,36,0.1)', badgeBorder: 'rgba(251,191,36,0.25)'  },
  90009: { id: 90009, name: 'Owner',         level: 9, color: '#F6B40E', badgeBg: 'rgba(246,180,14,0.15)',badgeBorder: 'rgba(246,180,14,0.4)'   },
} as const

export type RbacRankId = keyof typeof CUSTOM_RBAC_RANKS

export const RBAC_RANK_IDS = [90000, 90001, 90002, 90003, 90004, 90005, 90006, 90007, 90008, 90009] as const
export const RBAC_MIN = 90000
export const RBAC_MAX = 90009

/** Ranks requiring an extra confirmation warning in the UI. */
export const HIGH_RISK_RANKS = new Set([90007, 90008, 90009])

export function getRank(id: number) {
  return CUSTOM_RBAC_RANKS[id as RbacRankId] ?? null
}

export function getRankLevel(rankId: number | null | undefined): number {
  if (rankId == null) return -1
  return getRank(rankId)?.level ?? -1
}

/**
 * Authorization check for rank assignment.
 *
 * callerRankId  : caller's current RBAC rank (null = no rank, treated as Owner in bootstrap mode)
 * targetRankId  : target's current RBAC rank (null = no rank)
 * newRankId     : rank to assign (null = remove rank entirely)
 * selfId        : caller's account ID
 * targetId      : target's account ID
 */
export function canAssignRank(
  callerRankId: number | null,
  targetRankId: number | null,
  newRankId: number | null,
  selfId: number,
  targetId: number
): { ok: boolean; reason?: string } {
  if (selfId === targetId) {
    return { ok: false, reason: 'No podés modificar tu propio rango.' }
  }

  // Bootstrap: gmlevel=10 with no RBAC rank is treated as full authority (level 9).
  const callerLevel = callerRankId === null ? 9 : getRankLevel(callerRankId)
  const targetCurrentLevel = getRankLevel(targetRankId)
  const newRankLevel = newRankId === null ? -1 : getRankLevel(newRankId)

  if (targetCurrentLevel >= callerLevel) {
    const callerName = callerRankId !== null ? getRank(callerRankId)?.name : 'Directivo (bootstrap)'
    const targetName = targetRankId !== null ? getRank(targetRankId)?.name : 'sin rango'
    return {
      ok: false,
      reason: `${callerName} no puede modificar una cuenta con igual o mayor jerarquía (${targetName}).`,
    }
  }

  if (newRankId !== null && newRankLevel >= callerLevel) {
    const callerName = callerRankId !== null ? getRank(callerRankId)?.name : 'Directivo (bootstrap)'
    const newName = getRank(newRankId)?.name ?? String(newRankId)
    return {
      ok: false,
      reason: `${callerName} no puede otorgar el rango ${newName} (igual o superior al propio).`,
    }
  }

  return { ok: true }
}
