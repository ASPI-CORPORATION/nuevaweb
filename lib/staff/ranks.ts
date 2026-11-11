/**
 * WoW Argentina staff ranks — single source of truth (client-safe, no DB).
 *
 * Each internal rank maps to what is written in AzerothCore when it is assigned:
 *   - account_access.gmlevel (RealmID -1): the security level the core really enforces
 *     (1 = Moderator, 2 = GameMaster, 3 = Administrator). Present in every AzerothCore.
 *   - rbac_account_permissions (permission 90000–90009): ONLY on servers that have RBAC
 *     tables AND the permission registered in rbac_permissions. Stock AzerothCore has no RBAC.
 *
 * The gmlevel column mirrors the GM panel tiers already in use (lib/gm/permissions.ts):
 * GM1 Soporte = 1, GM2 Moderador = 2, GM3 Administrador = 3. Changing a value here changes
 * what promotions write to the game — review it with the server owner first.
 */

export type RankKey =
  | 'ayudante' | 'moderador' | 'game_master' | 'gm_senior' | 'supervisor_gm'
  | 'head_gm' | 'developer' | 'administrador' | 'co_owner' | 'owner'

export interface StaffRank {
  key: RankKey
  name: string
  /** Position in the WoW Argentina hierarchy (1 = lowest). */
  order: number
  /** Custom RBAC permission id (only used when the server has RBAC tables). */
  rbacId: number
  /** account_access.gmlevel written for this rank. */
  gmlevel: 1 | 2 | 3
  color: string
  /** Assigning, changing or removing it requires the Propietario. */
  ownerOnly: boolean
  /** Requires typing the username to confirm. */
  elevated: boolean
}

export const STAFF_RANKS: readonly StaffRank[] = [
  { key: 'ayudante',      name: 'Ayudante',      order: 1,  rbacId: 90000, gmlevel: 1, color: '#94a3b8', ownerOnly: false, elevated: false },
  { key: 'moderador',     name: 'Moderador',     order: 2,  rbacId: 90001, gmlevel: 2, color: '#60a5fa', ownerOnly: false, elevated: false },
  { key: 'game_master',   name: 'Game Master',   order: 3,  rbacId: 90002, gmlevel: 2, color: '#4ade80', ownerOnly: false, elevated: false },
  { key: 'gm_senior',     name: 'GM Senior',     order: 4,  rbacId: 90003, gmlevel: 2, color: '#34d399', ownerOnly: false, elevated: false },
  { key: 'supervisor_gm', name: 'Supervisor GM', order: 5,  rbacId: 90004, gmlevel: 3, color: '#22d3ee', ownerOnly: false, elevated: false },
  { key: 'head_gm',       name: 'Head GM',       order: 6,  rbacId: 90005, gmlevel: 3, color: '#a78bfa', ownerOnly: false, elevated: false },
  { key: 'developer',     name: 'Developer',     order: 7,  rbacId: 90006, gmlevel: 1, color: '#f472b6', ownerOnly: false, elevated: false },
  { key: 'administrador', name: 'Administrador', order: 8,  rbacId: 90007, gmlevel: 3, color: '#fb923c', ownerOnly: false, elevated: true },
  { key: 'co_owner',      name: 'Co-Owner',      order: 9,  rbacId: 90008, gmlevel: 3, color: '#fbbf24', ownerOnly: true,  elevated: true },
  { key: 'owner',         name: 'Owner',         order: 10, rbacId: 90009, gmlevel: 3, color: '#F6B40E', ownerOnly: true,  elevated: true },
] as const

export const RANK_KEYS = STAFF_RANKS.map(r => r.key) as RankKey[]
export const RBAC_RANK_MIN = 90000
export const RBAC_RANK_MAX = 90009

export function rankByKey(key: string | null | undefined): StaffRank | null {
  return STAFF_RANKS.find(r => r.key === key) ?? null
}
export function rankByRbac(id: number | null | undefined): StaffRank | null {
  return STAFF_RANKS.find(r => r.rbacId === id) ?? null
}
export function isRankKey(v: unknown): v is RankKey {
  return typeof v === 'string' && RANK_KEYS.includes(v as RankKey)
}

/** gmlevel labels as AzerothCore names them (AccountTypes). */
export const GMLEVEL_LABEL: Record<number, string> = {
  0: 'Jugador', 1: 'Moderador (1)', 2: 'Game Master (2)', 3: 'Administrador (3)', 4: 'Consola (4)',
}
export function gmlevelLabel(level: number | null | undefined) {
  const l = Number(level ?? 0)
  return GMLEVEL_LABEL[l] ?? `Nivel ${l}`
}

// ── Divisions ───────────────────────────────────────────────────────────────

export const DIVISION_ROLES = ['responsable', 'subresponsable', 'supervisor', 'miembro', 'en_formacion'] as const
export type DivisionRole = (typeof DIVISION_ROLES)[number]
export const DIVISION_ROLE_LABEL: Record<DivisionRole, string> = {
  responsable: 'Responsable',
  subresponsable: 'Subresponsable',
  supervisor: 'Supervisor',
  miembro: 'Miembro',
  en_formacion: 'Miembro en formación',
}

// ── Warnings ────────────────────────────────────────────────────────────────

export const WARNING_TYPES = ['verbal', 'escrita', 'grave', 'final'] as const
export type WarningType = (typeof WARNING_TYPES)[number]
export const WARNING_TYPE_LABEL: Record<WarningType, string> = {
  verbal: 'Advertencia verbal registrada',
  escrita: 'Advertencia escrita',
  grave: 'Advertencia grave',
  final: 'Advertencia final',
}
export const WARNING_TYPE_SHORT: Record<WarningType, string> = { verbal: 'Verbal', escrita: 'Escrita', grave: 'Grave', final: 'Final' }
export const WARNING_TYPE_COLOR: Record<WarningType, string> = { verbal: '#94a3b8', escrita: '#74ACDF', grave: '#fb923c', final: '#f87171' }

export const WARNING_STATUSES = ['vigente', 'revisada', 'apelada', 'anulada'] as const
export type WarningStatus = (typeof WARNING_STATUSES)[number]
export const WARNING_STATUS_LABEL: Record<WarningStatus, string> = { vigente: 'Vigente', revisada: 'Revisada', apelada: 'Apelada', anulada: 'Anulada' }
export const WARNING_STATUS_COLOR: Record<WarningStatus, string> = { vigente: '#F6B40E', revisada: '#74ACDF', apelada: '#a78bfa', anulada: '#64748b' }

// ── Suspensions ─────────────────────────────────────────────────────────────

export const SUSPENSION_SCOPE_LABEL = {
  interna: 'Suspensión interna de funciones',
  juego: 'Revocación temporal de permisos GM en el juego',
} as const
export type SuspensionScope = keyof typeof SUSPENSION_SCOPE_LABEL

export type SuspensionState = 'programada' | 'vigente' | 'finalizada' | 'levantada'
export const SUSPENSION_STATE_LABEL: Record<SuspensionState, string> = {
  programada: 'Programada', vigente: 'Vigente', finalizada: 'Finalizada', levantada: 'Levantada',
}

export function suspensionState(s: { status: string; starts_at: string | Date; ends_at: string | Date }, now = Date.now()): SuspensionState {
  if (s.status === 'levantada') return 'levantada'
  const start = new Date(s.starts_at).getTime()
  const end = new Date(s.ends_at).getTime()
  if (now < start) return 'programada'
  if (now < end) return 'vigente'
  return 'finalizada'
}

// ── Member status & history labels ──────────────────────────────────────────

export type MemberStatus = 'activo' | 'suspendido' | 'pendiente_restauracion' | 'retirado' | 'sin_permisos'
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  pendiente_restauracion: 'Permisos pendientes de restaurar',
  retirado: 'Retirado',
  sin_permisos: 'Sin permisos efectivos',
}
export const MEMBER_STATUS_COLOR: Record<MemberStatus, string> = {
  activo: '#4ade80', suspendido: '#f87171', pendiente_restauracion: '#F6B40E', retirado: '#64748b', sin_permisos: '#94a3b8',
}

export const ACTIVITY_LABEL: Record<string, string> = {
  STAFF_INCORPORADO: 'GM incorporado',
  STAFF_RANGO_ASIGNADO: 'Rango asignado',
  STAFF_ASCENDIDO: 'GM ascendido',
  STAFF_DEGRADADO: 'GM degradado',
  STAFF_RETIRADO: 'GM destituido',
  STAFF_PERFIL_EDITADO: 'Expediente editado',
  ADVERTENCIA_EMITIDA: 'Advertencia emitida',
  ADVERTENCIA_REVISADA: 'Advertencia revisada',
  ADVERTENCIA_APELADA: 'Advertencia apelada',
  ADVERTENCIA_ANULADA: 'Advertencia anulada',
  ADVERTENCIA_VIGENTE: 'Advertencia reactivada',
  DIVISION_ASIGNADA: 'División asignada',
  DIVISION_RETIRADA: 'División retirada',
  DIVISION_CARGO: 'Cargo de división cambiado',
  DIVISION_CREADA: 'División creada',
  DIVISION_EDITADA: 'División editada',
  DIVISION_DESACTIVADA: 'División desactivada',
  DIVISION_ACTIVADA: 'División reactivada',
  SUSPENSION_APLICADA: 'Suspensión aplicada',
  SUSPENSION_LEVANTADA: 'Suspensión levantada',
  PERMISOS_RESTAURADOS: 'Permisos restaurados',
  ACCION_DENEGADA: 'Acción denegada',
}
export function activityLabel(action: string) {
  return ACTIVITY_LABEL[action] ?? action
}
