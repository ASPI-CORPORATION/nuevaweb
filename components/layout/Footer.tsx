import Link from 'next/link'
import { Shield, Sword, Server, Wifi } from 'lucide-react'

const REALMLIST = process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar'
const DISCORD   = process.env.NEXT_PUBLIC_DISCORD_URL || '#'

const NAV_COLS = [
  {
    heading: 'Juego',
    links: [
      { href: '/download', label: 'Cómo Jugar' },
      { href: '/register', label: 'Crear Cuenta' },
      { href: '/login', label: 'Iniciar Sesión' },
      { href: '/personajes', label: 'Armería' },
      { href: '/vote', label: 'Votar' },
    ],
  },
  {
    heading: 'Comunidad',
    links: [
      { href: '/news', label: 'Noticias' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/cuenta/soporte', label: 'Soporte' },
      { href: '/shop', label: 'Tienda' },
    ],
  },
  {
    heading: 'Cuenta',
    links: [
      { href: '/cuenta', label: 'Mi Cuenta' },
      { href: '/cuenta/seguridad', label: 'Seguridad' },
      { href: '/cuenta/personajes', label: 'Personajes' },
      { href: '/cuenta/tickets', label: 'Tickets' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative z-10 mt-10 overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(3,8,20,0.95))', borderTop: '1px solid rgba(117,199,255,0.07)' }}>

      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(117,199,255,0.15), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">

          {/* Brand column – spans 2 on lg */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(117,199,255,0.15), rgba(5,15,38,0.9))',
                  border: '1px solid rgba(117,199,255,0.2)',
                  boxShadow: '0 0 20px rgba(117,199,255,0.1)',
                }}>
                <Shield className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="font-['Cinzel'] font-bold text-sm text-white leading-none">WoW</div>
                <div className="font-['Cinzel'] font-black text-xs tracking-widest leading-none" style={{ color: '#75C7FF' }}>
                  ARGENTINA
                </div>
              </div>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mb-5 max-w-xs">
              Servidor privado World of Warcraft WotLK 3.3.5a. Comunidad argentina, tres caminos de progresión, sets custom y más.
            </p>

            {/* Server info */}
            <div className="rounded-xl p-4 space-y-2.5"
              style={{ background: 'rgba(10,20,42,0.6)', border: '1px solid rgba(117,199,255,0.07)' }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <span className="text-xs text-slate-400">Servidor online · AzerothCore 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Sword className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-slate-400">Wrath of the Lich King 3.3.5a</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <code className="text-xs font-mono" style={{ color: '#75C7FF' }}>{REALMLIST}</code>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="text-xs text-slate-500">VPS Argentina</span>
              </div>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map(col => (
            <div key={col.heading}>
              <h4 className="font-['Cinzel'] text-xs font-semibold text-white mb-4 uppercase tracking-widest">
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href}
                      className="text-slate-500 hover:text-slate-200 text-sm transition-colors duration-150">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-slate-600 text-xs text-center md:text-left">
            © {new Date().getFullYear()} WoW Argentina. No afiliado a Blizzard Entertainment.
            World of Warcraft es marca registrada de Blizzard Entertainment, Inc.
          </p>

          <div className="flex items-center gap-4">
            {/* Discord icon */}
            <a href={DISCORD} target="_blank" rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <svg className="w-4 h-4" style={{ color: '#818cf8' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </div>
            </a>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>AzerothCore</span>
              <span>·</span>
              <span>WotLK 3.3.5a</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
