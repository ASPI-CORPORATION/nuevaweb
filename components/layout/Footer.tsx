import Link from 'next/link'
import { Shield, Sword, Users } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-blue-500/10 bg-gradient-to-b from-transparent to-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo + desc */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-900 flex items-center justify-center border border-blue-400/40">
                <Shield className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <div className="font-['Cinzel'] font-bold text-sm text-white">WoW</div>
                <div className="font-['Cinzel'] font-black text-blue-300 text-xs tracking-widest">ARGENTINA</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Servidor privado WoW WotLK 3.3.5a. Tres caminos, Sets Custom argentinos, comunidad activa.
            </p>
          </div>

          {/* Juego */}
          <div>
            <h4 className="font-['Cinzel'] text-sm font-semibold text-white mb-4 uppercase tracking-widest">Juego</h4>
            <ul className="space-y-2">
              {[
                { href: '/download', label: 'Cómo Jugar' },
                { href: '/register', label: 'Crear Cuenta' },
                { href: '/rankings', label: 'Rankings' },
                { href: '/armory/buscar', label: 'Armería' },
                { href: '/vote', label: 'Votar' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 hover:text-blue-300 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Comunidad */}
          <div>
            <h4 className="font-['Cinzel'] text-sm font-semibold text-white mb-4 uppercase tracking-widest">Comunidad</h4>
            <ul className="space-y-2">
              {[
                { href: '/news', label: 'Noticias' },
                { href: '/changelog', label: 'Changelog' },
                { href: '/cuenta/soporte', label: 'Soporte' },
                { href: '/shop', label: 'Tienda' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-400 hover:text-blue-300 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Servidor */}
          <div>
            <h4 className="font-['Cinzel'] text-sm font-semibold text-white mb-4 uppercase tracking-widest">Servidor</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
                <span className="text-slate-400 text-sm">AzerothCore Master 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-sm">WotLK 3.3.5a</span>
              </div>
              <div className="text-xs text-slate-500 mt-2 font-mono bg-slate-800/50 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar'}
              </div>
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Users className="w-4 h-4" />
                Discord
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            © 2024 WoW Argentina. No afiliado a Blizzard Entertainment.
            World of Warcraft es marca registrada de Blizzard Entertainment.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>AzerothCore 2026</span>
            <span>•</span>
            <span>WotLK 3.3.5a</span>
            <span>•</span>
            <span>VPS Miami</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
