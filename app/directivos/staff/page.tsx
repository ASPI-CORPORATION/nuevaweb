'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Crown, Loader2, Search } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const GM_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Jugador', color: '#94a3b8' },
  1: { label: 'Trial GM', color: '#60a5fa' },
  2: { label: 'GM', color: '#4ade80' },
  3: { label: 'Admin', color: '#c084fc' },
  10: { label: 'Directivo', color: '#FFD700' },
}

export default function DirectivosStaffPage() {
  const { data, mutate } = useSWR('/api/directivos/staff', fetcher)
  const staff = data?.staff ?? []
  const [q, setQ] = useState('')
  const [setId, setSetId] = useState<number | null>(null)
  const [newGm, setNewGm] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const confirmSet = async () => {
    if (!reason.trim()) return alert('Escribí un motivo')
    setSaving(true)
    const res = await fetch('/api/directivos/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: setId, gmlevel: newGm, reason }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error); return }
    setMsg('Rango actualizado')
    setSetId(null); setReason('')
    mutate()
    setTimeout(() => setMsg(''), 2000)
  }

  const filtered = staff.filter((s: { username: string }) => s.username.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-2" style={{ color: '#FFD700' }}>Gestión de Staff</h1>
      <p className="text-sm mb-6" style={{ color: '#a89060' }}>Modificar rangos del equipo. Toda acción queda registrada permanentemente.</p>

      {msg && <div className="mb-4 px-4 py-2 rounded-xl text-sm bg-green-500/15 border border-green-500/30 text-green-400">{msg}</div>}

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar staff..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/60 border text-white rounded-xl outline-none text-sm"
            style={{ borderColor: 'rgba(255,215,0,0.2)' }} />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
              <th className="text-left px-5 py-3 font-medium" style={{ color: '#a89060' }}>Usuario</th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: '#a89060' }}>Email</th>
              <th className="text-left px-3 py-3 font-medium" style={{ color: '#a89060' }}>Rango</th>
              <th className="text-right px-5 py-3 font-medium" style={{ color: '#a89060' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: { id: number; username: string; email: string; gmlevel: number }) => (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,215,0,0.05)' }}>
                <td className="px-5 py-3 font-medium text-white">{s.username}</td>
                <td className="px-3 py-3 text-xs" style={{ color: '#a89060' }}>{s.email}</td>
                <td className="px-3 py-3">
                  <span className="font-bold text-sm" style={{ color: (GM_LABELS[s.gmlevel] ?? GM_LABELS[0]).color }}>
                    {(GM_LABELS[s.gmlevel] ?? { label: `GM${s.gmlevel}` }).label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {setId === s.id ? (
                    <div className="flex flex-col gap-2 items-end">
                      <select value={newGm} onChange={e => setNewGm(parseInt(e.target.value))}
                        className="px-2 py-1 bg-slate-900 text-white rounded-lg text-xs outline-none" style={{ border: '1px solid rgba(255,215,0,0.2)' }}>
                        <option value={0}>Jugador (0)</option>
                        <option value={1}>Trial GM (1)</option>
                        <option value={2}>GM (2)</option>
                        <option value={3}>Admin (3)</option>
                        <option value={10}>Directivo (10)</option>
                      </select>
                      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo *"
                        className="px-2 py-1 bg-slate-900 text-white rounded-lg text-xs outline-none w-40"
                        style={{ border: '1px solid rgba(255,215,0,0.2)' }} />
                      <div className="flex gap-1">
                        <button onClick={confirmSet} disabled={saving} className="px-2 py-1 rounded-lg text-xs font-medium text-black" style={{ background: '#FFD700' }}>
                          {saving ? '...' : 'OK'}
                        </button>
                        <button onClick={() => setSetId(null)} className="px-2 py-1 bg-slate-700 text-white rounded-lg text-xs">✕</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setSetId(s.id); setNewGm(s.gmlevel) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-black"
                      style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}>
                      <Crown className="w-3 h-3" /> Cambiar rango
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-500">No hay staff</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
