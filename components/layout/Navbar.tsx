'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Shield, User, LogOut, ChevronDown } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/news', label: 'Noticias' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/changelog', label: 'Cambios' },
  { href: '/download', label: 'Descargar' },
  { href: '/vote', label: 'Votar' },
  { href: '/shop', label: 'Tienda' },
]

interface NavUser {
  id: number
  username: string
  gmlevel: number
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<NavUser | null>(null)
  const [dropdown, setDropdown] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 navbar-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-900 flex items-center justify-center border border-blue-400/40 shadow-lg group-hover:shadow-blue-500/40 transition-shadow">
                <Shield className="w-5 h-5 text-blue-200" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400/60 border border-blue-300/40" />
            </div>
            <div>
              <div className="font-['Cinzel'] font-bold text-sm leading-none text-white group-hover:text-blue-200 transition-colors">
                WoW
              </div>
              <div className="font-['Cinzel'] font-black text-blue-300 text-xs leading-none tracking-widest">
                ARGENTINA
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-md font-['Inter'] tracking-wide
                  ${pathname === link.href
                    ? 'text-blue-300 bg-blue-500/10'
                    : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/5'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdown(!dropdown)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-600/30 transition-all"
                >
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">{user.username}</span>
                  {user.gmlevel >= 10 && (
                    <span className="text-xs text-yellow-400 font-bold">★</span>
                  )}
                  {user.gmlevel >= 3 && user.gmlevel < 10 && (
                    <span className="text-xs text-orange-400 font-bold">◆</span>
                  )}
                  {user.gmlevel >= 2 && user.gmlevel < 3 && (
                    <span className="text-xs text-green-400 font-bold">▲</span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {dropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-1 w-48 rounded-xl border border-blue-500/20 bg-slate-900/95 backdrop-blur-sm shadow-2xl overflow-hidden"
                      onMouseLeave={() => setDropdown(false)}
                    >
                      <Link href="/cuenta" className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-blue-500/10 transition-colors">
                        <User className="w-4 h-4" /> Mi Cuenta
                      </Link>
                      {user.gmlevel >= 2 && (
                        <Link href="/gm" className="flex items-center gap-2 px-4 py-3 text-sm text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors">
                          <Shield className="w-4 h-4" /> Panel GM
                        </Link>
                      )}
                      {user.gmlevel >= 3 && (
                        <Link href="/admin" className="flex items-center gap-2 px-4 py-3 text-sm text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors">
                          <Shield className="w-4 h-4" /> Panel Admin
                        </Link>
                      )}
                      {user.gmlevel >= 10 && (
                        <Link href="/directivos" className="flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors border-t border-yellow-500/20">
                          <Shield className="w-4 h-4" /> ★ Directivos
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-slate-700/50"
                      >
                        <LogOut className="w-4 h-4" /> Salir
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-600/50 hover:border-blue-500/50 rounded-lg transition-all"
                >
                  Ingresar
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-400 hover:bg-blue-300 rounded-lg transition-all shadow-lg shadow-blue-500/20"
                >
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-slate-300 hover:text-white p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-blue-500/10 bg-slate-900/95 backdrop-blur-sm"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${pathname === link.href ? 'text-blue-300 bg-blue-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-slate-700/50 flex gap-2">
                {user ? (
                  <>
                    <Link href="/cuenta" className="flex-1 text-center px-4 py-2 text-sm text-white bg-slate-800 rounded-lg" onClick={() => setOpen(false)}>
                      Mi Cuenta
                    </Link>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg">
                      Salir
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)} className="flex-1 text-center px-4 py-2 text-sm text-slate-300 border border-slate-600/50 rounded-lg">
                      Ingresar
                    </Link>
                    <Link href="/register" onClick={() => setOpen(false)} className="flex-1 text-center px-4 py-2 text-sm text-blue-900 bg-blue-400 rounded-lg font-medium">
                      Registrarse
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
