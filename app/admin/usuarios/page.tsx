'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, ChevronUp } from 'lucide-react'
import { notify } from '@/components/ui/toaster'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Account {
  id: number; username: string; email: string; last_ip: string
  online: number; joindate: string; gmlevel: number
}

const GM_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Jugador', color: 'text-slate-400' },
  1: { label: 'Trial GM', color: 'text-blue-400' },
  2: { label: 'GM', color: 'text-green-400' },
  3: { label: 'Admin', color: 'text-purple-400' },
  10: { label: 'Directivo', color: 'text-yellow-400' },
}

export default function AdminUsuariosPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const { data, mutate } = useSWR(`/api/admin/users?q=${search}`, fetcher)
  const accounts: Account[] = data?.accounts ?? []
  const [setting, setSetting] = useState<number | null>(null)
  const [newGm, setNewGm] = useState(0)

  const setGmlevel = async (accountId: number) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, action: 'set_gmlevel', gmlevel: newGm }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      notify.error(d.error || 'No se pudo cambiar el nivel')
      return
    }
    notify.success('Nivel de GM actualizado')
    mutate()
    setSetting(null)
  }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Usuarios</h1>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSearch(q)}
            placeholder="Buscar por usuario o email..." className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
        </div>
        <button onClick={() => setSearch(q)} className="px-4 py-2.5 bg-[#74ACDF] hover:bg-[#8cc0ec] text-[#050A14] font-semibold rounded-xl text-sm font-medium transition-colors">Buscar</button>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="table-scroll"><table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Usuario</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Email</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Rango</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Estado</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Registro</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {accounts.map(a => (
              <tr key={a.id} className="hover:bg-slate-800/20">
                <td className="px-5 py-3 font-medium text-white">{a.username}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">{a.email}</td>
                <td className="px-3 py-3">
                  <span className={`font-medium ${(GM_LABELS[a.gmlevel] ?? GM_LABELS[0]).color}`}>
                    {(GM_LABELS[a.gmlevel] ?? { label: `GM${a.gmlevel}` }).label}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${a.online ? 'bg-green-400' : 'bg-slate-600'}`}></span>
                  <span className="text-xs text-slate-400">{a.online ? 'Online' : 'Offline'}</span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">{format(new Date(a.joindate), 'd MMM yyyy', { locale: es })}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end">
                    {setting === a.id ? (
                      <div className="flex items-center gap-2">
                        <select value={newGm} onChange={e => setNewGm(parseInt(e.target.value))} className="px-2 py-1 bg-slate-800 border border-slate-600 text-white rounded-lg text-xs outline-none">
                          <option value={0}>Jugador (0)</option>
                          <option value={1}>Trial GM (1)</option>
                          <option value={2}>GM (2)</option>
                          <option value={3}>Admin (3)</option>
                        </select>
                        <button onClick={() => setGmlevel(a.id)} className="px-2 py-1 bg-[#74ACDF] text-[#050A14] font-semibold rounded-lg text-xs">OK</button>
                        <button onClick={() => setSetting(null)} className="px-2 py-1 bg-slate-700 text-white rounded-lg text-xs">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setSetting(a.id); setNewGm(a.gmlevel) }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors">
                        <ChevronUp className="w-3 h-3" /> Rango
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-500">No hay resultados</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
