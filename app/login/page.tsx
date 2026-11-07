'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SolDeMayo } from '@/components/brand/SolDeMayo'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
  const params = useSearchParams()
  const requested = params.get('redirect') || ''
  // Only same-origin paths: blocks open redirects like ?redirect=https://evil.example or //evil.example
  const redirect = requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/\\')
    ? requested
    : '/cuenta'

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      // Hard redirect so the browser sends a fresh request with the new cookie.
      // router.push + router.refresh() races against itself and re-renders /login.
      window.location.href = redirect
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(116,172,223,0.16),transparent_70%)]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <SolDeMayo className="w-16 h-16" />
          </div>
          <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-1">Ingresar</h1>
          <p className="text-slate-400 text-sm">Accedé a tu cuenta de WoW Argentina</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre de cuenta
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="TuNombre"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-600/50 focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">Contraseña</label>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/60 border border-slate-600/50 focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-gold w-full py-3.5 text-base font-['Cinzel']"
            >
              {loading ? 'Ingresando...' : 'INGRESAR'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-4">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
            Registrate gratis
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
