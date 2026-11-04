'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, Check } from 'lucide-react'

function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (form.newPassword !== form.confirmPassword) {
      setMsg({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/cuenta/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: '¡Contraseña actualizada! Usala la próxima vez que entres al juego.' })
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setMsg({ type: 'error', text: data.error || 'Error al cambiar contraseña' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña actual</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.newPassword}
            onChange={e => setForm({ ...form, newPassword: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500 transition-colors"
            minLength={6}
            maxLength={16}
            required
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Repetir nueva contraseña</label>
        <input
          type={showPass ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500 transition-colors"
          required
        />
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg.type === 'success' && <Check className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
        {loading ? 'Guardando...' : 'Cambiar Contraseña'}
      </button>
    </form>
  )
}

export default function SeguridadPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Seguridad</h1>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Cambiar Contraseña</h2>
            <p className="text-xs text-slate-400">La misma contraseña que usás en el juego (SRP6)</p>
          </div>
        </div>
        <ChangePasswordForm />
      </div>

      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-300 mb-1">Sobre la seguridad de tu cuenta</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu contraseña usa el sistema SRP6 de Blizzard. Cambiarla desde acá también la actualiza en el juego.
              No compartas tu contraseña con nadie, ni siquiera con el staff. Si algún GM te la pide, reportalo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
