'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { History, Search, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { fetcher, fmtDate, PageHeader, EmptyState, Skeletons, ErrorBox, Pill, inputCls } from '@/components/gm/ui'
import { StaffSubnav, selectCls } from '@/components/directivos/staff/kit'
import { activityLabel } from '@/lib/staff/ranks'

interface Row {
  id: number; created_at: string; target_account_id: number | null; target_name: string | null; actor_name: string
  action: string; reason: string | null; details: string | null; result: 'ok' | 'error' | 'denegado'; reference: string | null
}
const RESULT: Record<string, { label: string; color: string }> = {
  ok: { label: 'Completada', color: '#4ade80' }, error: { label: 'Error', color: '#f87171' }, denegado: { label: 'Denegada', color: '#F6B40E' },
}

export default function HistorialStaffPage() {
  const [f, setF] = useState({ q: '', actor: '', action: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const params = new URLSearchParams(Object.entries({ ...f, page: String(page) }).filter(([, v]) => v))
  const { data, error, isLoading } = useSWR(`/api/directivos/staff/historial?${params}`, fetcher, { keepPreviousData: true })
  const rows: Row[] = data?.rows ?? []
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const set = (k: keyof typeof f, v: string) => { setF(x => ({ ...x, [k]: v })); setPage(1) }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Auditoría" title="Historial del Staff"
        description="Todos los movimientos administrativos del staff: incorporaciones, ascensos, degradaciones, retiros, advertencias, divisiones y suspensiones." />
      <StaffSubnav />
      <p className="text-xs text-slate-400 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" aria-hidden="true" /> Registro de solo lectura: la base de datos impide editar o borrar entradas.</p>

      <div className="panel-card p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Cuenta afectada (usuario o ID), motivo o detalle" className={`${inputCls} pl-9`} aria-label="Buscar en el historial" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <input value={f.actor} onChange={e => set('actor', e.target.value)} placeholder="Responsable" className={inputCls} aria-label="Responsable" />
          <select value={f.action} onChange={e => set('action', e.target.value)} className={selectCls} aria-label="Acción">
            <option value="">Todas las acciones</option>
            {(data?.actions ?? []).map((a: string) => <option key={a} value={a}>{activityLabel(a)}</option>)}
          </select>
          <input type="date" value={f.from} onChange={e => set('from', e.target.value)} className={`${inputCls} min-w-0`} aria-label="Desde" />
          <input type="date" value={f.to} onChange={e => set('to', e.target.value)} className={`${inputCls} min-w-0`} aria-label="Hasta" />
        </div>
      </div>

      <ErrorBox error={error} />
      <section className="panel-card overflow-hidden">
        {isLoading && !data ? <Skeletons rows={6} /> : rows.length === 0 ? <EmptyState icon={History} title="Sin movimientos" text="Los cambios administrativos aparecerán acá." /> : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="px-4 py-3">Fecha</th><th className="px-3 py-3">Cuenta afectada</th><th className="px-3 py-3">Acción</th>
                  <th className="px-3 py-3">Responsable</th><th className="px-3 py-3">Motivo</th><th className="px-3 py-3">Resultado</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(r => (
                    <tr key={r.id} className="align-top hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-3">{r.target_account_id ? <Link href={`/directivos/staff/${r.target_account_id}`} className="text-[#74ACDF] hover:underline">{r.target_name ?? `#${r.target_account_id}`}</Link> : <span className="text-slate-500">—</span>}</td>
                      <td className="px-3 py-3"><div className="text-white font-medium">{activityLabel(r.action)}</div>{r.details && <div className="text-xs text-slate-500 max-w-[320px] break-words">{r.details}</div>}</td>
                      <td className="px-3 py-3 text-slate-300">{r.actor_name}</td>
                      <td className="px-3 py-3 text-slate-300 max-w-[260px] break-words">{r.reason ?? '—'}</td>
                      <td className="px-3 py-3"><Pill color={RESULT[r.result].color}>{RESULT[r.result].label}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="lg:hidden divide-y divide-white/5">
              {rows.map(r => (
                <li key={r.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-white font-medium">{activityLabel(r.action)}</span>
                    <Pill color={RESULT[r.result].color}>{RESULT[r.result].label}</Pill>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{fmtDate(r.created_at)} · por {r.actor_name}</p>
                  {r.target_account_id && <p className="text-sm mt-1">Cuenta: <Link href={`/directivos/staff/${r.target_account_id}`} className="text-[#74ACDF] hover:underline">{r.target_name ?? `#${r.target_account_id}`}</Link></p>}
                  {r.reason && <p className="text-sm text-slate-300 mt-1 break-words">Motivo: {r.reason}</p>}
                  {r.details && <p className="text-xs text-slate-500 mt-0.5 break-words">{r.details}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-2 disabled:opacity-40" aria-label="Anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-slate-400">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-2 disabled:opacity-40" aria-label="Siguiente"><ChevronRight className="w-4 h-4" /></button>
        </nav>
      )}
    </div>
  )
}
