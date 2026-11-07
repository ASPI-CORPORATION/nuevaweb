/** Client-safe content constants shared by admin forms, APIs and public pages. */

// Must match the ENUM of wowargentina_cms.cms_news.category exactly
export const NEWS_CATEGORIES = ['Actualizaciones', 'Eventos', 'PvP', 'PvE', 'General', 'Mantenimiento'] as const
export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

export const NEWS_CATEGORY_STYLE: Record<string, { color: string; label: string }> = {
  Actualizaciones: { color: '#74ACDF', label: 'Actualizaciones' },
  Eventos: { color: '#F6B40E', label: 'Eventos' },
  PvP: { color: '#f87171', label: 'PvP' },
  PvE: { color: '#4ade80', label: 'PvE' },
  General: { color: '#cbd5e1', label: 'General' },
  Mantenimiento: { color: '#fb923c', label: 'Mantenimiento' },
}

export const CHANGELOG_CATEGORIES = ['Nuevo', 'Corrección', 'Balance', 'Evento'] as const
export type ChangelogCategory = (typeof CHANGELOG_CATEGORIES)[number]

export const CHANGELOG_CATEGORY_STYLE: Record<string, { color: string; label: string }> = {
  Nuevo: { color: '#4ade80', label: 'Nuevo' },
  'Corrección': { color: '#74ACDF', label: 'Corrección' },
  Balance: { color: '#F6B40E', label: 'Balance' },
  Evento: { color: '#c084fc', label: 'Evento' },
}

// Legacy change-entry types stored in cms_changelog.changes JSON before this release
export const LEGACY_CHANGE_TYPE_MAP: Record<string, ChangelogCategory> = {
  NUEVO: 'Nuevo',
  FIX: 'Corrección',
  CORRECCION: 'Corrección',
  'CORRECCIÓN': 'Corrección',
  BALANCE: 'Balance',
  CAMBIO: 'Balance',
  EVENTO: 'Evento',
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const UPLOAD_URL_PREFIX = '/api/uploads/'
const UPLOAD_NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/

export function isUploadUrl(url: string): boolean {
  return url.startsWith(UPLOAD_URL_PREFIX) && UPLOAD_NAME_RE.test(url.slice(UPLOAD_URL_PREFIX.length))
}

/** Images may only come from our upload store or a plain https URL. */
export function isSafeImageUrl(url: string): boolean {
  if (isUploadUrl(url)) return true
  try {
    const u = new URL(url)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

/** "Actualización 3.3 — ¡Ñandú!" → "actualizacion-3-3-nandu" */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
