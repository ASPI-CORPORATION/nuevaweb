'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SolDeMayo } from '@/components/brand/SolDeMayo'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check } from 'lucide-react'
import { notify } from '@/components/ui/toaster'

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    terms: false,
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!form.terms) {
      setError('Tenés que aceptar los términos de servicio')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email,
          terms: form.terms,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta')
        notify.error('No se pudo crear la cuenta', data.error || 'Ocurrió un problema. Intentá nuevamente.')
        return
      }

      setSuccess(true)
      notify.success('¡Cuenta creada!', 'Bienvenido a WoW Argentina. Te llevamos a tu panel.')
      // Full navigation so the new session cookie is sent with the request
      setTimeout(() => { window.location.href = '/cuenta' }, 1800)
    } catch {
      setError('Error de red. Intentá de nuevo.')
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const validateUsername = () => {
    if (!form.username) return null
    if (form.username.length < 3) return 'Mínimo 3 caracteres'
    if (form.username.length > 16) return 'Máximo 16 caracteres'
    if (!/^[a-zA-Z0-9]+$/.test(form.username)) return 'Solo letras y números'
    return 'ok'
  }

  const usernameStatus = validateUsername()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(116,172,223,0.16),transparent_70%)]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <SolDeMayo className="w-16 h-16" />
          </div>
          <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-1">Crear Cuenta</h1>
          <p className="text-slate-400 text-sm">Únite a WoW Argentina ahora</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-2">¡Cuenta creada!</h3>
              <p className="text-slate-400 text-sm">Bienvenido a WoW Argentina. Redirigiendo...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nombre de cuenta
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    placeholder="TuNombre"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-600/50 focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors"
                    maxLength={16}
                    required
                    autoComplete="username"
                  />
                  {form.username && (
                    <div className={`absolute right-3 top-3.5 w-2 h-2 rounded-full ${usernameStatus === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">3-16 caracteres, solo letras y números. Es tu login en el juego.</p>
                {usernameStatus && usernameStatus !== 'ok' && (
                  <p className="mt-1 text-xs text-red-400">{usernameStatus}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-600/50 focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/60 border border-slate-600/50 focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors"
                    minLength={6}
                    maxLength={16}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">6-16 caracteres. Usás la misma contraseña para entrar al juego.</p>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Repetir contraseña
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-xl bg-slate-800/60 border focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'border-red-500/50'
                      : 'border-slate-600/50'
                  }`}
                  required
                />
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  form.terms ? 'bg-[#74ACDF] border-[#74ACDF]' : 'bg-transparent border-slate-600'
                }`}>
                  {form.terms && <Check className="w-3 h-3 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={e => setForm({ ...form, terms: e.target.checked })}
                  className="hidden"
                />
                <span className="text-sm text-slate-400">
                  Acepto los términos de servicio y entiendo que esta es una cuenta en un servidor privado no afiliado a Blizzard.
                </span>
              </label>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-gold w-full py-3.5 text-base font-['Cinzel']"
              >
                {loading ? 'Creando cuenta...' : 'CREAR CUENTA'}
              </motion.button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Iniciá sesión
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
