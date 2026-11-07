'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Menu, X, User, LogOut, ChevronDown, Shield, ShieldCheck, Crown, Download, UserPlus, LogIn } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { FlagStripe } from '@/components/brand/SolDeMayo'
import { DiscordIcon } from '@/components/brand/DiscordIcon'
import { DISCORD_URL, PUBLIC_NAV } from '@/lib/site-config'
import { hasRole, ROLE_LABEL, type WebRole } from '@/lib/roles'

interface NavUser {
  id: number
  username: string
  role: WebRole
}

function panelLinks(role: WebRole) {
  return [
    { href: '/cuenta', label: 'Mi Cuenta', icon: User, color: '#75C7FF', show: true },
    { href: '/gm', label: 'Panel GM', icon: Shield, color: '#4ade80', show: hasRole(role, 'gm') },
    { href: '/admin', label: 'Panel Admin', icon: ShieldCheck, color: '#74ACDF', show: hasRole(role, 'admin') },
    { href: '/directivos', label: 'Panel Directivos', icon: Crown, color: '#F6B40E', show: hasRole(role, 'directivo') },
  ].filter(l => l.show)
}

const ROLE_BADGE: Record<WebRole, { text: string; color: string } | null> = {
  user: null,
  gm: { text: 'GM', color: '#4ade80' },
  admin: { text: 'ADMIN', color: '#74ACDF' },
  directivo: { text: '★ DIRECTIVO', color: '#F6B40E' },
}

export function Navbar() {
  const [drawer, setDrawer] = useState(false)
  const [menu, setMenu] = useState(false)
  const [user, setUser] = useState<NavUser | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (alive) setUser(data?.user ?? null) })
      .catch(() => { if (alive) setUser(null) })
      .finally(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [pathname])

  useEffect(() => { setDrawer(false); setMenu(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  useEffect(() => {
    if (!drawer) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [drawer])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'))
  const badge = user ? ROLE_BADGE[user.role] : null

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
          scrolled || drawer ? 'bg-[#050A14]/92 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : 'bg-[#050A14]/60 backdrop-blur-sm'
        }`}
      >
        <FlagStripe className="h-[3px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[61px] gap-3">
            <Logo />

            <nav className="hidden xl:flex items-center gap-0.5" aria-label="Principal">
              {PUBLIC_NAV.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`relative px-3 py-2 text-[13px] font-medium tracking-wide rounded-lg transition-colors ${
                    isActive(link.href) ? 'text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-[#74ACDF] via-[#F6B40E] to-[#74ACDF]"
                    />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord de WoW Argentina"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-[#a5b4fc] bg-[#5865F2]/10 border border-[#5865F2]/25 hover:bg-[#5865F2]/20 hover:text-white transition-colors"
              >
                <DiscordIcon className="w-4 h-4" />
              </a>

              {/* Desktop auth */}
              <div className="hidden xl:block">
                {user ? (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenu(m => !m)}
                      aria-expanded={menu}
                      aria-haspopup="menu"
                      className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg text-sm text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#74ACDF] to-[#101F35] flex items-center justify-center text-[11px] font-bold text-white">
                        {user.username.charAt(0)}
                      </span>
                      <span className="max-w-[120px] truncate font-medium">{user.username}</span>
                      {badge && <span className="text-[10px] font-bold" style={{ color: badge.color }}>{badge.text}</span>}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menu ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {menu && (
                        <motion.div
                          role="menu"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 rounded-xl border border-[#74ACDF]/20 bg-[#0A1628]/98 backdrop-blur-md shadow-2xl overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-white/5">
                            <div className="text-sm font-semibold text-white truncate">{user.username}</div>
                            <div className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</div>
                          </div>
                          {panelLinks(user.role).map(l => (
                            <Link key={l.href} href={l.href} role="menuitem" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: l.color }}>
                              <l.icon className="w-4 h-4" /> {l.label}
                            </Link>
                          ))}
                          <button onClick={handleLogout} role="menuitem" className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 border-t border-white/5 transition-colors">
                            <LogOut className="w-4 h-4" /> Cerrar sesión
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}>
                    <Link href="/login" className="px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white rounded-lg border border-white/15 hover:border-[#74ACDF]/50 transition-colors">
                      Ingresar
                    </Link>
                    <Link href="/register" className="btn-primary px-4 py-2 text-sm">
                      Crear cuenta
                    </Link>
                  </div>
                )}
              </div>

              {!user && loaded && (
                <Link href="/register" className="xl:hidden hidden sm:inline-flex btn-primary px-3.5 py-2 text-sm">
                  Jugar gratis
                </Link>
              )}

              <button
                className="xl:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-200 hover:bg-white/10 border border-white/10"
                onClick={() => setDrawer(d => !d)}
                aria-expanded={drawer}
                aria-controls="mobile-drawer"
                aria-label={drawer ? 'Cerrar menú' : 'Abrir menú'}
              >
                {drawer ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {drawer && (
          <div className="xl:hidden fixed inset-0 z-40" id="mobile-drawer">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menú principal"
              className="absolute right-0 top-0 bottom-0 w-[88vw] max-w-sm pt-16 bg-[#0A1628] border-l border-[#74ACDF]/20 overflow-y-auto overscroll-contain"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ type: 'tween', duration: 0.24, ease: 'easeOut' }}
            >
              <div className="p-4 space-y-5">
                {user ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#74ACDF] to-[#101F35] flex items-center justify-center font-bold text-white">
                        {user.username.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{user.username}</div>
                        <div className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</div>
                      </div>
                    </div>
                    <div className="grid gap-1">
                      {panelLinks(user.role).map(l => (
                        <Link key={l.href} href={l.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm bg-white/[0.02] hover:bg-white/5" style={{ color: l.color }}>
                          <l.icon className="w-4 h-4" /> {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/login" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-white border border-white/15 bg-white/[0.03]">
                      <LogIn className="w-4 h-4" /> Ingresar
                    </Link>
                    <Link href="/register" className="btn-primary flex items-center justify-center gap-2 px-3 py-3 text-sm">
                      <UserPlus className="w-4 h-4" /> Crear cuenta
                    </Link>
                  </div>
                )}

                <nav aria-label="Secciones" className="grid gap-0.5">
                  {PUBLIC_NAV.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      className={`px-3 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                        isActive(link.href) ? 'text-white bg-[#74ACDF]/12 shadow-[inset_3px_0_0_#74ACDF]' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="grid gap-2">
                  <Link href="/download" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-[#050A14] bg-[#F6B40E] hover:bg-[#ffc832]">
                    <Download className="w-4 h-4" /> Descargar cliente
                  </Link>
                  <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4]">
                    <DiscordIcon className="w-4 h-4" /> Unite al Discord
                  </a>
                  {user && (
                    <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm text-red-400 border border-red-500/25">
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
