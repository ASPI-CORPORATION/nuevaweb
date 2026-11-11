/**
 * Single source of truth for public site links. Client-safe.
 * The Discord invite and the realmlist are intentionally hard-coded (not read from env) so a
 * stale NEXT_PUBLIC_DISCORD_URL / NEXT_PUBLIC_REALMLIST in a server's .env can never
 * resurrect an old value. This only changes what the website shows: the authserver
 * address itself is configured in AzerothCore.
 */
export const SITE = {
  name: 'WoW Argentina',
  tagline: 'Dominá Rasganorte',
  mode: 'Instant 80',
  discordUrl: 'https://discord.gg/9KmrAPJzjn',
  realmlist: 'logon.wowarg.com',
  realmName: process.env.NEXT_PUBLIC_REALM_NAME || 'WoW Argentina',
} as const

export const DISCORD_URL = SITE.discordUrl
/** Exactly what players paste into realmlist.wtf. */
export const REALMLIST_LINE = `set realmlist ${SITE.realmlist}`

export const PUBLIC_NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/news', label: 'Noticias' },
  { href: '/changelog', label: 'Cambios' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/personajes', label: 'Armory' },
  { href: '/download', label: 'Descargar' },
  { href: '/vote', label: 'Votar' },
  { href: '/shop', label: 'Tienda' },
] as const
