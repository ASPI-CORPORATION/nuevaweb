'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Shield, ShoppingBag,
  MessageSquare, History, Lock, LogOut
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/cuenta', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/cuenta/personajes', label: 'Personajes', icon: Users },
  { href: '/cuenta/seguridad', label: 'Seguridad', icon: Lock },
  { href: '/cuenta/soporte', label: 'Soporte', icon: MessageSquare },
  { href: '/cuenta/historial', label: 'Historial', icon: History },
]

export function CuentaSidebar({ username, gmlevel }: { username: string; gmlevel: number }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-56 flex-shrink-0 hidden md:block">
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 sticky top-24">
        {/* User info */}
        <div className="mb-4 pb-4 border-b border-slate-700/50">
          <div className="font-['Cinzel'] font-bold text-white text-sm">{username}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {gmlevel >= 10 ? '★ Directivo' : gmlevel >= 3 ? '◆ Admin' : gmlevel >= 2 ? '▲ GM' : 'Jugador'}
          </div>
        </div>

        {/* Nav links */}
        <nav className="space-y-1">
          {links.map(link => {
            const Icon = link.icon
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Panel links for GMs */}
        {gmlevel >= 2 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-1">
            <div className="text-xs text-slate-500 px-3 mb-2 uppercase tracking-wider">Staff</div>
            {gmlevel >= 2 && (
              <Link href="/gm" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-green-400 hover:bg-green-500/10 transition-colors">
                <Shield className="w-4 h-4" /> Panel GM
              </Link>
            )}
            {gmlevel >= 3 && (
              <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-orange-400 hover:bg-orange-500/10 transition-colors">
                <Shield className="w-4 h-4" /> Panel Admin
              </Link>
            )}
            {gmlevel >= 10 && (
              <Link href="/directivos" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors border border-yellow-500/20">
                <Shield className="w-4 h-4" /> ★ Directivos
              </Link>
            )}
          </div>
        )}

        {/* Logout */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
