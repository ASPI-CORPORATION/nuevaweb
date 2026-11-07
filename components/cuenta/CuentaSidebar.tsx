'use client'

import { LayoutDashboard, Users, MessageSquare, History, Lock, User } from 'lucide-react'
import { PanelNav, type PanelLink } from '@/components/panel/PanelNav'
import { panelCrossLinks } from '@/components/panel/crossLinks'
import { ROLE_LABEL, type WebRole } from '@/lib/roles'

const links: PanelLink[] = [
  { href: '/cuenta', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/cuenta/personajes', label: 'Personajes', icon: Users },
  { href: '/cuenta/seguridad', label: 'Seguridad', icon: Lock },
  { href: '/cuenta/soporte', label: 'Soporte', icon: MessageSquare },
  { href: '/cuenta/historial', label: 'Historial', icon: History },
]

export function CuentaSidebar({ username, role }: { username: string; role: WebRole }) {
  return (
    <PanelNav
      accent="#75C7FF"
      title="Mi Cuenta"
      username={username}
      roleLabel={ROLE_LABEL[role]}
      badge={User}
      links={links}
      crossLinks={panelCrossLinks(role, 'cuenta')}
      showLogout
    />
  )
}
