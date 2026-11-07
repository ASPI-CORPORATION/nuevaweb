import Link from 'next/link'
import { Server, Download, UserPlus } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { FlagStripe, SolDeMayo } from '@/components/brand/SolDeMayo'
import { DiscordIcon } from '@/components/brand/DiscordIcon'
import { SITE, DISCORD_URL } from '@/lib/site-config'

const NAV_COLS = [
  {
    heading: 'Empezar a jugar',
    links: [
      { href: '/register', label: 'Crear cuenta' },
      { href: '/download', label: 'Descargar cliente' },
      { href: '/login', label: 'Ingresar' },
      { href: '/vote', label: 'Votar por el servidor' },
    ],
  },
  {
    heading: 'Comunidad',
    links: [
      { href: '/news', label: 'Noticias' },
      { href: '/changelog', label: 'Actualizaciones' },
      { href: '/rankings', label: 'Rankings' },
      { href: '/personajes', label: 'Armory' },
    ],
  },
  {
    heading: 'Tu cuenta',
    links: [
      { href: '/cuenta', label: 'Mi cuenta' },
      { href: '/cuenta/personajes', label: 'Personajes' },
      { href: '/cuenta/soporte', label: 'Soporte y tickets' },
      { href: '/shop', label: 'Tienda' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative z-10 mt-16 border-t border-[#74ACDF]/15 bg-gradient-to-b from-[#050A14] to-[#040812] overflow-hidden">
      <FlagStripe className="h-1 opacity-80" />
      <SolDeMayo className="absolute -right-24 -bottom-24 w-80 h-80 opacity-[0.04] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div className="space-y-5">
            <Logo />
            <p className="text-sm text-slate-400 max-w-sm">
              Servidor argentino de World of Warcraft: Wrath of the Lich King 3.3.5a. Comunidad, eventos y Rasganorte con identidad propia.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 max-w-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500 mb-1.5">
                <Server className="w-3.5 h-3.5" /> Realmlist
              </div>
              <code className="block text-sm text-[#cfe6f8] break-all">set realmlist {SITE.realmlist}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors">
                <DiscordIcon className="w-4 h-4" /> Discord oficial
              </a>
              <Link href="/download" className="btn-ghost">
                <Download className="w-4 h-4" /> Descargar
              </Link>
            </div>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-8" aria-label="Pie de página">
            {NAV_COLS.map(col => (
              <div key={col.heading}>
                <h3 className="font-['Cinzel'] text-sm font-bold text-white mb-3 tracking-wide">{col.heading}</h3>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-slate-400 hover:text-[#74ACDF] transition-colors">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 rounded-2xl border border-[#F6B40E]/20 bg-gradient-to-r from-[#101F35] via-[#0D1E35] to-[#101F35] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="font-['Cinzel'] text-lg font-bold text-white">¿Listo para Rasganorte?</div>
            <div className="text-sm text-slate-400">Creá tu cuenta gratis, descargá el cliente y sumate a la comunidad.</div>
          </div>
          <Link href="/register" className="btn-gold w-full md:w-auto">
            <UserPlus className="w-4 h-4" /> Crear cuenta gratis
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {SITE.name}. Hecho en Argentina.</p>
          <p className="md:text-right">No afiliado a Blizzard Entertainment. World of Warcraft es marca registrada de Blizzard Entertainment, Inc.</p>
        </div>
      </div>
    </footer>
  )
}
