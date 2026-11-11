'use client'

import {
  LayoutDashboard, Users, Ban, Server, TrendingUp, BookOpen, Settings, Crown, Shield,
  Newspaper, List, ShoppingBag, Network, History,
} from 'lucide-react'
import { PanelNav, type PanelLink } from '@/components/panel/PanelNav'
import { panelCrossLinks } from '@/components/panel/crossLinks'
import type { WebRole } from '@/lib/roles'

const links: PanelLink[] = [
  { href: '/directivos', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/directivos/equipo', label: 'Gestión de Directivos', icon: Crown },
  { href: '/directivos/staff', label: 'Staff y Rangos', icon: Users },
  { href: '/directivos/staff/divisiones', label: 'Gestión de Divisiones', icon: Network },
  { href: '/directivos/staff/historial', label: 'Historial del Staff', icon: History },
  { href: '/directivos/cuentas', label: 'Cuentas', icon: Shield },
  { href: '/directivos/baneos', label: 'Baneos', icon: Ban },
  { href: '/directivos/economia', label: 'Economía', icon: TrendingUp },
  { href: '/directivos/servidor', label: 'Servidor', icon: Server },
  { href: '/directivos/auditoria', label: 'Auditoría', icon: BookOpen },
  { href: '/directivos/configuracion', label: 'Configuración', icon: Settings },
  { href: '/admin/noticias', label: 'Noticias', icon: Newspaper },
  { href: '/admin/changelog', label: 'Changelog', icon: List },
  { href: '/admin/tienda', label: 'Tienda', icon: ShoppingBag },
]

interface Props {
  user: { username: string; role: WebRole; rankName?: string | null }
}

export default function DirectivosSidebar({ user }: Props) {
  return (
    <PanelNav
      accent="#F6B40E"
      title="Panel Directivos"
      username={user.username}
      roleLabel={user.rankName ?? 'Directivo'}
      badge={Crown}
      links={links}
      crossLinks={panelCrossLinks(user.role, 'directivos')}
    />
  )
}
