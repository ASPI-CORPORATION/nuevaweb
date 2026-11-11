'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ScrollText, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetcher, fmtDate, fmtAgo, PageHeader, Pill, EmptyState, Skeletons, ErrorBox, OnlineDot, inputCls } from '@/components/gm/ui'
import { GM_TIER_SHORT, type GmTier } from '@/lib/gm/permissions'

interface Log {
  id: number; createdAt: string; gm: string; gmTier: GmTier | null; targetId: number | null; target: string | null; character: string | null
  action: string; reason: string | null; result: string | null; reference: string | null; details: string | null; ip: string | null
}
interface Staff { id: number; username: string; gmlevel: number; online: number; last_login: string | null; actions_7d: number; sanctions_30d: number; open_tickets: number; closed_30d: number }

const RESULT_COLOR: Record<string, string> = { ok: '#4ade80', error: '#f87171', denegado: '#F6B40E' }

export default function HistorialPage() {
  const [f, setF] = useState({ gm: '', action: '', target: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'logs' | 'staff'>('logs')
  const params = new URLSearchParams(Object.entries({ ...f, page: String(page), staff: tab === 'staff' ? '1' : '' }).filter(([, v]) => v))
  const { data, error, isLoading } = useSWR(`/api/gm/audit?${params}`, fetcher, { keepPreviousData: true })
  const logs: Log[] = data?.logs ?? []
  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1
  const set = (k: keyof typeof f, v: string) => { setF(x => ({ ...x, [k]: v })); setPage(1) }
  const full = data?.scope === 'completo'

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Auditoría" title="Registro de actividad GM"
        description={full ? 'Registro completo de acciones GM (solo lectura). Los registros de Directivos están en su propio panel.' : 'Vista parcial: acciones de GM nivel 1 y 2, IPs enmascaradas.'} />

      {full && (
        <div className="flex gap-1.5" role="tablist">
          {([['logs', 'Actividad'], ['staff', 'Supervisión del staff']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border ${tab === k ? 'bg-[#74ACDF] text-[#050A14] border-[#74ACDF]' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>{l}</button>
          ))}
        </div>
      )}

      <ErrorBox error={error} />

      {tab === 'staff' && full ? (
        <section className="panel-card overflow-hidden">
          {!data?.staff ? <Skeletons rows={4} /> : data.staff.length === 0 ? <EmptyState icon={Users} title="No hay cuentas de staff" /> : (
            <ul className="divide-y divide-white/5">
              {(data.staff as Staff[]).map(s => (
                <li key={s.id} className="p-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap"><Link href={`/gm/cuentas/${s.id}`} className="font-semibold text-white hover:underline">{s.username}</Link><Pill color="#74ACDF">gmlevel {s.gmlevel}</Pill><OnlineDot online={!!s.online} /></div>
                    <div className="text-xs text-slate-500">Último acceso {s.last_login ? fmtAgo(s.last_login) : 'nunca'}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {[['Acciones 7d', s.actions_7d], ['Sanciones 30d', s.sanctions_30d], ['Tickets abiertos', s.open_tickets], ['Cerrados 30d', s.closed_30d]].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5"><div className="text-white font-bold">{v}</div><div className="text-slate-500">{l}</div></div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <div className="panel-card p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <input value={f.gm} onChange={e => set('gm', e.target.value)} placeholder="GM" className={inputCls} aria-label="GM" />
            <select value={f.action} onChange={e => set('action', e.target.value)} className={inputCls} aria-label="Acción">
              <option value="">Todas las acciones</option>
              {(data?.actions ?? []).map((a: string) => <option key={a}>{a}</option>)}
            </select>
            <input value={f.target} onChange={e => set('target', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="ID cuenta afectada" className={inputCls} aria-label="Cuenta afectada" />
            <input type="date" value={f.from} onChange={e => set('from', e.target.value)} className={inputCls} aria-label="Desde" />
            <input type="date" value={f.to} onChange={e => set('to', e.target.value)} className={inputCls} aria-label="Hasta" />
          </div>
          <section className="panel-card overflow-hidden">
            {isLoading && !data ? <Skeletons rows={6} /> : logs.length === 0 ? <EmptyState icon={ScrollText} title="Sin registros" /> : (
              <ul className="divide-y divide-white/5">
                {logs.map(l => (
                  <li key={l.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-[#F6B40E]">{l.action}</span>
                      {l.result && <Pill color={RESULT_COLOR[l.result] ?? '#94a3b8'}>{l.result}</Pill>}
                      <span className="text-xs text-slate-500">{fmtDate(l.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-200 mt-1 break-words">{l.details}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      GM <span className="text-slate-300">{l.gm}</span>{l.gmTier ? ` (${GM_TIER_SHORT[l.gmTier]})` : ''}
                      {l.target ? <> · cuenta <Link href={`/gm/cuentas/${l.targetId}`} className="text-[#74ACDF] hover:underline">{l.target}</Link></> : ''}
                      {l.character ? ` · ${l.character}` : ''}{l.reason ? ` · motivo: ${l.reason}` : ''}{l.reference ? ` · ${l.reference}` : ''}{l.ip ? ` · IP ${l.ip}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {pages > 1 && (
            <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-2 disabled:opacity-40" aria-label="Anterior"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-slate-400">{page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-2 disabled:opacity-40" aria-label="Siguiente"><ChevronRight className="w-4 h-4" /></button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
