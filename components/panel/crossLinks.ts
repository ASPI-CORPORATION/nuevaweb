import { User, Shield, ShieldCheck, Crown } from 'lucide-react'
import { hasRole, type WebRole } from '@/lib/roles'
import type { PanelLink } from './PanelNav'

type Area = 'cuenta' | 'gm' | 'admin' | 'directivos'

export function panelCrossLinks(role: WebRole, current: Area): PanelLink[] {
  const all: Array<PanelLink & { area: Area; min: WebRole }> = [
    { area: 'cuenta', min: 'user', href: '/cuenta', label: 'Mi Cuenta', icon: User, color: '#75C7FF' },
    { area: 'gm', min: 'gm', href: '/gm', label: 'Panel GM', icon: Shield, color: '#4ade80' },
    { area: 'admin', min: 'admin', href: '/admin', label: 'Panel Admin', icon: ShieldCheck, color: '#74ACDF' },
    { area: 'directivos', min: 'directivo', href: '/directivos', label: 'Panel Directivos', icon: Crown, color: '#F6B40E' },
  ]
  return all
    .filter(l => l.area !== current && hasRole(role, l.min))
    .map(({ href, label, icon, color }) => ({ href, label, icon, color }))
}
