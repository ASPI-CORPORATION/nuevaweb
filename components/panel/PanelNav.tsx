'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, LogOut, type LucideIcon } from 'lucide-react'

export interface PanelLink {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  color?: string
}

interface Props {
  accent: string
  title: string
  username: string
  roleLabel: string
  badge: LucideIcon
  links: PanelLink[]
  crossLinks?: PanelLink[]
  showLogout?: boolean
}

function matches(pathname: string, link: PanelLink) {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + '/')
}

/** The most specific matching link wins (e.g. /directivos/staff/divisiones over /directivos/staff). */
function activeLink(pathname: string, links: PanelLink[]) {
  return links.filter(l => matches(pathname, l)).sort((a, b) => b.href.length - a.href.length)[0] ?? null
}

export function PanelNav({ accent, title, username, roleLabel, badge: Badge, links, crossLinks = [], showLogout }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const currentMatch = activeLink(pathname, links)
  const current = currentMatch ?? links[0]

  const [routeSeen, setRouteSeen] = useState(pathname)
  if (routeSeen !== pathname) {
    setRouteSeen(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const nav = (
    <>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: `${accent}26` }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
        >
          <Badge className="w-5 h-5 text-[#050A14]" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{title}</div>
          <div className="font-['Cinzel'] font-bold text-white text-sm truncate">{username}</div>
          <div className="text-xs text-slate-400">{roleLabel}</div>
        </div>
      </div>

      <nav className="p-2 space-y-0.5" aria-label={title}>
        {links.map(link => {
          const Icon = link.icon
          const active = link === currentMatch || (!links.includes(link) && matches(pathname, link))
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { background: `${accent}1f`, boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" style={active ? { color: accent } : undefined} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {crossLinks.length > 0 && (
        <div className="p-2 pt-3 mt-1 border-t space-y-0.5" style={{ borderColor: `${accent}1a` }}>
          <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Otros paneles</div>
          {crossLinks.map(link => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors"
                style={{ color: link.color ?? '#cbd5e1' }}
              >
                <Icon className="w-4 h-4 shrink-0" /> {link.label}
              </Link>
            )
          })}
        </div>
      )}

      {showLogout && (
        <div className="p-2 border-t" style={{ borderColor: `${accent}1a` }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </>
  )

  const CurrentIcon = current.icon

  return (
    <>
      {/* Mobile / tablet trigger */}
      <div className="lg:hidden sticky top-16 z-30 -mx-4 px-4 py-2 bg-[#050A14]/90 backdrop-blur-md border-b" style={{ borderColor: `${accent}26` }}>
        <button
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="panel-drawer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
          style={{ background: `${accent}12`, border: `1px solid ${accent}33` }}
        >
          <Menu className="w-5 h-5 shrink-0" style={{ color: accent }} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>{title}</span>
            <span className="flex items-center gap-1.5 text-sm text-white font-medium truncate">
              <CurrentIcon className="w-3.5 h-3.5 shrink-0" /> {current.label}
            </span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-[60]" id="panel-drawer" role="dialog" aria-modal="true" aria-label={title}>
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-xs overflow-y-auto bg-[#0A1628] border-r"
              style={{ borderColor: `${accent}33` }}
              initial={reduce ? { opacity: 0 } : { x: '-100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
              {nav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div
          className="sticky top-24 rounded-2xl overflow-hidden bg-[#0A1628]/80 backdrop-blur-sm"
          style={{ border: `1px solid ${accent}2e` }}
        >
          {nav}
        </div>
      </aside>
    </>
  )
}
