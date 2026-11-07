'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type LogType = 'all' | 'general' | 'gm'

export default function AdminLogsPage() {
  const [type, setType] = useState<LogType>('all')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data } = useSWR(`/api/admin/logs?type=${type}&q=${search}&page=${page}`, fetcher)
  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Logs del Sistema</h1>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1">
          {(['all', 'general', 'gm'] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${type === t ? 'bg-[#74ACDF] text-[#050A14] font-semibold' : 'text-slate-400 hover:text-white'}`}>
              {t === 'all' ? 'Todos' : t === 'general' ? 'General' : 'GM'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSearch(q)}
              placeholder="Buscar en logs..." className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
          </div>
          <button onClick={() => setSearch(q)} className="px-4 py-2 bg-[#74ACDF] hover:bg-[#8cc0ec] text-[#050A14] font-semibold rounded-xl text-sm transition-colors">Filtrar</button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-700/30">
          {logs.map((log: { id: number; action: string; details: string; created_at: string; username?: string; gm_name?: string; ip?: string }) => (
            <div key={log.id} className="px-5 py-3 text-sm hover:bg-slate-800/20">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-medium text-white text-xs">{log.username ?? log.gm_name ?? 'Sistema'}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/15 font-mono">{log.action}</span>
                    {log.ip && <span className="text-xs text-slate-600 font-mono">{log.ip}</span>}
                  </div>
                  <div className="text-slate-400 text-xs truncate">{log.details}</div>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
                  {format(new Date(log.created_at), 'd MMM HH:mm', { locale: es })}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-center py-8 text-slate-500">No hay logs</div>}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">← Anterior</button>
          <span className="text-sm text-slate-400">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  )
}
