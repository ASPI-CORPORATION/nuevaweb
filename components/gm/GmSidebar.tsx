'use client'

import { LayoutDashboard, Users, MessageSquare, FileText, Shield } from 'lucide-react'
import { PanelNav, type PanelLink } from '@/components/panel/PanelNav'
import { panelCrossLinks } from '@/components/panel/crossLinks'
import { ROLE_LABEL, type WebRole } from '@/lib/roles'

const links: PanelLink[] = [
  { href: '/gm', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/gm/buscar', label: 'Buscar Jugador', icon: Users },
  { href: '/gm/tickets', label: 'Tickets', icon: MessageSquare },
  { href: '/gm/logs', label: 'Logs', icon: FileText },
]

export function GmSidebar({ username, role }: { username: string; role: WebRole }) {
  return (
    <PanelNav
      accent="#4ade80"
      title="Panel GM"
      username={username}
      roleLabel={ROLE_LABEL[role]}
      badge={Shield}
      links={links}
      crossLinks={panelCrossLinks(role, 'gm')}
    />
  )
}
