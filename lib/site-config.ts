/**
 * Single source of truth for public site links. Client-safe.
 * The Discord invite is intentionally hard-coded (not read from env) so a stale
 * NEXT_PUBLIC_DISCORD_URL in a server's .env can never resurrect an old invite.
 */
export const SITE = {
  name: 'WoW Argentina',
  tagline: 'Dominá Rasganorte',
  discordUrl: 'https://discord.gg/9KmrAPJzjn',
  realmlist: process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar',
  realmName: process.env.NEXT_PUBLIC_REALM_NAME || 'WoW Argentina',
} as const

export const DISCORD_URL = SITE.discordUrl

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
