'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Ban, Server, TrendingUp, BookOpen, Settings, Crown, Shield
} from 'lucide-react'

interface Props {
  user: { username: string; gmlevel: number }
}

const links = [
  { href: '/directivos', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/directivos/staff', label: 'Staff', icon: Users },
  { href: '/directivos/baneos', label: 'Baneos', icon: Ban },
  { href: '/directivos/cuentas', label: 'Cuentas', icon: Shield },
  { href: '/directivos/servidor', label: 'Servidor', icon: Server },
  { href: '/directivos/economia', label: 'Economía', icon: TrendingUp },
  { href: '/directivos/auditoria', label: 'Auditoría', icon: BookOpen },
  { href: '/directivos/configuracion', label: 'Configuración', icon: Settings },
]

export default function DirectivosSidebar({ user }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0">
      <div
        className="rounded-2xl p-4 mb-4 text-center"
        style={{ background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
          style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}
        >
          <Crown className="w-5 h-5 text-black" />
        </div>
        <div className="font-semibold text-white text-sm">{user.username}</div>
        <div className="text-xs font-medium mt-0.5" style={{ color: '#FFD700' }}>Directivo</div>
      </div>

      <nav
        className="rounded-2xl p-2 space-y-0.5"
        style={{ background: 'rgba(255, 215, 0, 0.03)', border: '1px solid rgba(255, 215, 0, 0.15)' }}
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/directivos' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'text-black font-semibold'
                  : 'hover:bg-yellow-500/10'
              }`}
              style={active ? { background: 'linear-gradient(135deg, #FFD700, #B8860B)', color: '#000' } : { color: '#a89060' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
