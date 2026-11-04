'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, MessageSquare, FileText, Shield } from 'lucide-react'

const links = [
  { href: '/gm', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/gm/buscar', label: 'Buscar Jugador', icon: Users },
  { href: '/gm/tickets', label: 'Tickets', icon: MessageSquare },
  { href: '/gm/logs', label: 'Logs', icon: FileText },
]

export function GmSidebar({ username, gmlevel }: { username: string; gmlevel: number }) {
  const pathname = usePathname()
  return (
    <aside className="w-56 flex-shrink-0 hidden md:block">
      <div className="bg-slate-900/60 border border-green-500/20 rounded-2xl p-4 sticky top-24">
        <div className="mb-4 pb-4 border-b border-green-500/20">
          <div className="text-xs text-green-400 font-bold uppercase tracking-widest mb-1">Panel GM</div>
          <div className="font-['Cinzel'] font-bold text-white text-sm">{username}</div>
          <div className="text-xs text-green-400">GM Level {gmlevel}</div>
        </div>
        <nav className="space-y-1">
          {links.map(link => {
            const Icon = link.icon
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active ? 'bg-green-500/15 text-green-300 border border-green-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" /> {link.label}
              </Link>
            )
          })}
        </nav>
        {gmlevel >= 3 && (
          <div className="mt-4 pt-4 border-t border-green-500/20">
            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-orange-400 hover:bg-orange-500/10 rounded-xl text-sm transition-colors">
              <Shield className="w-4 h-4" /> Panel Admin
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
