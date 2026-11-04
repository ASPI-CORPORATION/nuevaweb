'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Newspaper, List, ShoppingBag, Users,
  Settings, FileText, Shield, Crown
} from 'lucide-react'

interface Props {
  user: { username: string; gmlevel: number }
}

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/noticias', label: 'Noticias', icon: Newspaper },
  { href: '/admin/changelog', label: 'Changelog', icon: List },
  { href: '/admin/tienda', label: 'Tienda', icon: ShoppingBag },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/logs', label: 'Logs', icon: FileText },
  { href: '/admin/config', label: 'Configuración', icon: Settings },
]

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0">
      <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-4 mb-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-2">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="font-semibold text-white text-sm">{user.username}</div>
          <div className="text-xs text-purple-400 font-medium">Admin</div>
        </div>
      </div>

      <nav className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-2 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}

        {user.gmlevel >= 10 && (
          <Link
            href="/directivos"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors mt-2 border border-yellow-500/20"
          >
            <Crown className="w-4 h-4" />
            Panel Directivos
          </Link>
        )}
      </nav>
    </aside>
  )
}
