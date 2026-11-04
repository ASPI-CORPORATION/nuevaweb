'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, AlertTriangle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
type LogType = 'directivos' | 'gm' | 'general'

export default function DirectivosAuditoriaPage() {
  const [type, setType] = useState<LogType>('directivos')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data } = useSWR(`/api/directivos/auditoria?type=${type}&q=${search}&page=${page}`, fetcher)
  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  const goldStyle = { borderColor: 'rgba(255,215,0,0.15)' }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-2" style={{ color: '#FFD700' }}>Auditoría</h1>
      <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)', color: '#f97316' }}>
        <AlertTriangle className="w-3.5 h-3.5" />
        Los logs de Directivos NUNCA pueden ser eliminados.
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
          {(['directivos', 'gm', 'general'] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setPage(1) }}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={type === t ? { background: 'linear-gradient(135deg,#FFD700,#B8860B)', color: '#000' } : { color: '#a89060' }}>
              {t === 'directivos' ? 'Directivos' : t === 'gm' ? 'GM' : 'General'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSearch(q)}
              placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-slate-900 text-white rounded-xl outline-none text-sm" style={goldStyle} />
          </div>
          <button onClick={() => setSearch(q)} className="px-4 py-2 rounded-xl text-sm font-medium text-black" style={{ background: 'linear-gradient(135deg,#FFD700,#B8860B)' }}>
            Filtrar
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,215,0,0.02)', border: '1px solid rgba(255,215,0,0.1)' }}>
        <div className="text-xs px-5 py-2.5 font-medium" style={{ background: 'rgba(255,215,0,0.05)', borderBottom: '1px solid rgba(255,215,0,0.1)', color: '#a89060' }}>
          {total.toLocaleString()} registros
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,215,0,0.05)' }}>
          {logs.map((log: { id: number; action: string; details: string; created_at: string; directivo_name?: string; gm_name?: string; username?: string; ip?: string }) => (
            <div key={log.id} className="px-5 py-3 hover:bg-yellow-500/[0.03]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-medium text-white text-xs">{log.directivo_name ?? log.gm_name ?? log.username ?? 'Sistema'}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,215,0,0.1)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.2)' }}>
                      {log.action}
                    </span>
                  </div>
                  <div className="text-xs truncate" style={{ color: '#a89060' }}>{log.details}</div>
                </div>
                <div className="text-xs whitespace-nowrap" style={{ color: '#6b5a30' }}>
                  {format(new Date(log.created_at), 'd MMM HH:mm', { locale: es })}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-center py-8 text-slate-500 text-sm">Sin registros</div>}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 text-black"
            style={{ background: 'linear-gradient(135deg,#FFD700,#B8860B)' }}>← Anterior</button>
          <span className="text-sm" style={{ color: '#a89060' }}>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 text-black"
            style={{ background: 'linear-gradient(135deg,#FFD700,#B8860B)' }}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}
