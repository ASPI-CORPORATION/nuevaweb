'use client'

import { useState } from 'react'
import { Server, Megaphone, RefreshCw, Loader2 } from 'lucide-react'

export default function DirectivosServidorPage() {
  const [announce, setAnnounce] = useState('')
  const [loading, setLoading] = useState('')
  const [msg, setMsg] = useState('')

  const execute = async (action: string, extra: Record<string, unknown> = {}) => {
    setLoading(action)
    setMsg('')
    const res = await fetch('/api/directivos/servidor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    setLoading('')
    if (!res.ok) { setMsg('Error: ' + data.error); return }
    setMsg(data.result || data.status || '¡Ejecutado!')
  }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-6" style={{ color: '#FFD700' }}>Control del Servidor</h1>

      {msg && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-mono" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' }}>
          {msg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4" style={{ color: '#FFD700' }} />
            <h2 className="font-semibold text-white">Anuncio global</h2>
          </div>
          <textarea value={announce} onChange={e => setAnnounce(e.target.value)}
            placeholder="Mensaje para todos los jugadores online..." rows={4}
            className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-sm outline-none resize-none mb-3"
            style={{ border: '1px solid rgba(255,215,0,0.2)' }} />
          <button
            onClick={() => execute('announce', { message: announce })}
            disabled={!announce.trim() || !!loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}>
            {loading === 'announce' && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar anuncio
          </button>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4" style={{ color: '#FFD700' }} />
            <h2 className="font-semibold text-white">Acciones del servidor</h2>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => execute('get_status')}
              disabled={!!loading}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' }}>
              {loading === 'get_status' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
              Ver estado del servidor
            </button>
            <button
              onClick={() => { if (confirm('¿Recargar la configuración del servidor?')) execute('reload_config') }}
              disabled={!!loading}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' }}>
              {loading === 'reload_config' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Recargar configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
