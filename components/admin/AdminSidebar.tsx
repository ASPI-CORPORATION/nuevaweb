'use client'

import {
  LayoutDashboard, Newspaper, List, ShoppingBag, Users, Settings, FileText, ShieldCheck,
} from 'lucide-react'
import { PanelNav, type PanelLink } from '@/components/panel/PanelNav'
import { panelCrossLinks } from '@/components/panel/crossLinks'
import { ROLE_LABEL, type WebRole } from '@/lib/roles'

const links: PanelLink[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/noticias', label: 'Noticias', icon: Newspaper },
  { href: '/admin/changelog', label: 'Changelog', icon: List },
  { href: '/admin/tienda', label: 'Tienda', icon: ShoppingBag },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/logs', label: 'Logs', icon: FileText },
  { href: '/admin/config', label: 'Configuración', icon: Settings },
]

interface Props {
  user: { username: string; role: WebRole }
}

export default function AdminSidebar({ user }: Props) {
  return (
    <PanelNav
      accent="#74ACDF"
      title="Panel Admin"
      username={user.username}
      roleLabel={ROLE_LABEL[user.role]}
      badge={ShieldCheck}
      links={links}
      crossLinks={panelCrossLinks(user.role, 'admin')}
    />
  )
}
