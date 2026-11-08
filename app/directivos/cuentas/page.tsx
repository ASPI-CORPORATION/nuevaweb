'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { notify } from '@/components/ui/toaster'

export default function DirectivosCuentasPage() {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<{ account: { id: number; username: string; email: string; last_ip: string; online: number; joindate: string }; gmlevel: number; banned: boolean; characters: Array<{ guid: number; name: string; level: number; class: number; online: number }> } | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const search = async () => {
    if (!q.trim()) return
    setLoading(true); setResult(null); setMsg('')
    const res = await fetch(`/api/gm/player?q=${encodeURIComponent(q)}`)
    setLoading(false)
    if (!res.ok) { setMsg('No encontrado'); notify.error('Cuenta inexistente', 'No encontramos un jugador o cuenta con ese dato.'); return }
    setResult(await res.json())
  }

  const goldStyle = { borderColor: 'rgba(246, 180, 14,0.2)' }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-6" style={{ color: '#F6B40E' }}>Cuentas</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Buscar por cuenta o personaje..." className="w-full pl-9 pr-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
        </div>
        <button onClick={search} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#F6B40E,#B8860B)' }}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Buscar
        </button>
      </div>

      {msg && <div className="text-slate-500 text-sm">{msg}</div>}

      {result && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
            <h2 className="font-semibold text-white mb-4">{result.account.username}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['ID', result.account.id],
                ['Email', result.account.email],
                ['Último IP', result.account.last_ip],
                ['Registro', result.account.joindate ? format(new Date(result.account.joindate), 'd MMM yyyy', { locale: es }) : '-'],
                ['GM Level', result.gmlevel],
                ['Estado', result.account.online ? '🟢 Online' : '⚫ Offline'],
                ['Baneado', result.banned ? '🔴 Sí' : '✅ No'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(246, 180, 14,0.06)' }}>
                  <span style={{ color: '#a89060' }}>{k}</span>
                  <span className="text-white font-mono text-xs">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
            <h3 className="font-semibold text-white mb-3 text-sm">Personajes ({result.characters.length})</h3>
            <div className="space-y-2">
              {result.characters.map(c => (
                <div key={c.guid} className="flex items-center justify-between text-sm py-1.5" style={{ borderBottom: '1px solid rgba(246, 180, 14,0.06)' }}>
                  <span className="text-white">{c.name}</span>
                  <div className="flex gap-3 text-xs" style={{ color: '#a89060' }}>
                    <span>Nivel {c.level}</span>
                    <span>{c.online ? '🟢' : '⚫'}</span>
                  </div>
                </div>
              ))}
              {result.characters.length === 0 && <div className="text-xs" style={{ color: '#a89060' }}>Sin personajes</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
