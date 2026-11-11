'use client'

import {
  LayoutDashboard, Users, Swords, LifeBuoy, Radio, Gavel, ScrollText, Server, Shield,
} from 'lucide-react'
import { PanelNav, type PanelLink } from '@/components/panel/PanelNav'
import { panelCrossLinks } from '@/components/panel/crossLinks'
import type { WebRole } from '@/lib/roles'
import { can, GM_TIER_LABEL, type GmCap, type GmTier } from '@/lib/gm/permissions'

const LINKS: Array<PanelLink & { cap: GmCap }> = [
  { href: '/gm', label: 'Dashboard', icon: LayoutDashboard, exact: true, cap: 'serverStatus' },
  { href: '/gm/cuentas', label: 'Cuentas registradas', icon: Users, cap: 'viewAccounts' },
  { href: '/gm/personajes', label: 'Personajes', icon: Swords, cap: 'viewCharacters' },
  { href: '/gm/soporte', label: 'Centro de soporte', icon: LifeBuoy, cap: 'viewTickets' },
  { href: '/gm/online', label: 'Jugadores online', icon: Radio, cap: 'onlinePlayers' },
  { href: '/gm/sanciones', label: 'Sanciones', icon: Gavel, cap: 'viewSanctions' },
  { href: '/gm/historial', label: 'Historial GM', icon: ScrollText, cap: 'auditPartial' },
  { href: '/gm/servidor', label: 'Estado del servidor', icon: Server, cap: 'serverStatus' },
]

export function GmSidebar({ username, role, tier }: { username: string; role: WebRole; tier: GmTier }) {
  const links = LINKS.filter(l => can(tier, l.cap)).map(({ cap: _cap, ...l }) => { void _cap; return l })
  return (
    <PanelNav
      accent="#74ACDF"
      title="Panel Game Master"
      username={username}
      roleLabel={GM_TIER_LABEL[tier]}
      badge={Shield}
      links={links}
      crossLinks={panelCrossLinks(role, 'gm')}
    />
  )
}
