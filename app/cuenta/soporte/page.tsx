'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Plus, ChevronDown, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORIES = ['Bug', 'Donación', 'Ban', 'Personaje Atascado', 'Tienda', 'Otro']
const STATUS_COLORS: Record<string, string> = {
  'Abierto': 'text-green-400 bg-green-500/10 border-green-500/20',
  'En Revisión': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Cerrado': 'text-slate-400 bg-slate-700/40 border-slate-600/40',
}

export default function SoportePage() {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ category: 'Bug', subject: '', message: '', character: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const { data, mutate } = useSWR('/api/cuenta/tickets', fetcher)
  const tickets = data?.tickets ?? []

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/cuenta/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (res.ok) {
        setMsg('¡Ticket creado! Te responderemos pronto.')
        setShowNew(false)
        setForm({ category: 'Bug', subject: '', message: '', character: '' })
        mutate()
      } else {
        setMsg(d.error || 'Error al crear ticket')
      }
    } catch {
      setMsg('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Cinzel'] font-black text-3xl text-white">Soporte</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Ticket
        </button>
      </div>

      {/* New ticket form */}
      {showNew && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-blue-500/20 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold text-white mb-4">Crear Nuevo Ticket</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoría</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Personaje (opcional)</label>
                <input
                  type="text"
                  value={form.character}
                  onChange={e => setForm({ ...form, character: e.target.value })}
                  placeholder="NombrePersonaje"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Asunto</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Resumen del problema"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                required maxLength={255}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción</label>
              <textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Describí tu problema en detalle..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                required
              />
            </div>
            {msg && <div className="text-sm text-blue-400">{msg}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors">
                {loading ? 'Creando...' : 'Crear Ticket'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-2">No tenés tickets</p>
          <p className="text-sm">Si necesitás ayuda, creá un ticket</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: any) => (
            <div key={t.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-white mb-1">{t.subject}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-blue-400">{t.category}</span>
                    <span>{format(new Date(t.created_at), "d MMM yyyy", { locale: es })}</span>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[t.status] || STATUS_COLORS.Abierto}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
