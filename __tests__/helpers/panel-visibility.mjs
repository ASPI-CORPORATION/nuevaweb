import { hasRole } from '../../lib/roles.ts'

// Mirrors the role gates used by Navbar.panelLinks and components/panel/crossLinks.ts
const PANELS = [
  { href: '/cuenta', min: 'user' },
  { href: '/gm', min: 'gm' },
  { href: '/admin', min: 'admin' },
  { href: '/directivos', min: 'directivo' },
]

export function panelVisibility(role) {
  return PANELS.filter(p => hasRole(role, p.min)).map(p => p.href)
}
