'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { BarChart3, Info } from 'lucide-react'
import { fetcher, fmtDate, PageHeader, EmptyState, Skeletons, ErrorBox } from '@/components/gm/ui'
import { StaffSubnav, RankBadge, StatusPill, DivisionChip, selectCls } from '@/components/directivos/staff/kit'
import { STAFF_RANKS, type MemberStatus, type DivisionRole } from '@/lib/staff/ranks'

interface Row {
  id: number; username: string; rank: string | null; status: MemberStatus; joinedAt: string | null; warnings: number
  divisions: Array<{ id: number; name: string; color: string; role: DivisionRole }>
  ticketsAccepted: number; ticketsResolved: number; ticketsPending: number; firstResponseSeconds: number | null; firstResponseSample: number
  sanctions: number; actions: number
}

function fmtDuration(s: number | null) {
  if (s == null) return '—'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`
  if (s < 86400) return `${(s / 3600).toFixed(1)} h`
  return `${(s / 86400).toFixed(1)} d`
}
function seniority(v: string | null) {
  if (!v) return 'Sin registro'
  const days = Math.floor((Date.now() - new Date(v).getTime()) / 86400000)
  if (days < 31) return `${days} días`
  if (days < 365) return `${Math.floor(days / 30)} meses`
  return `${(days / 365).toFixed(1)} años`
}

export default function RendimientoPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [division, setDivision] = useState('')
  const [member, setMember] = useState('')
  const [rank, setRank] = useState('')
  const params = new URLSearchParams(Object.entries({ period, division, member, rank }).filter(([, v]) => v))
  const { data, error } = useSWR(`/api/directivos/staff/rendimiento?${params}`, fetcher, { keepPreviousData: true })
  const { data: divs } = useSWR('/api/directivos/divisiones', fetcher)
  const { data: staff } = useSWR('/api/directivos/staff', fetcher)
  const rows: Row[] = [...(data?.rows ?? [])].sort((a: Row, b: Row) => a.username.localeCompare(b.username))

  const metrics: Array<[string, (r: Row) => React.ReactNode]> = [
    ['Aceptados', r => r.ticketsAccepted],
    ['Resueltos', r => r.ticketsResolved],
    ['Pendientes', r => r.ticketsPending],
    ['1.ª respuesta', r => <span title={r.firstResponseSample ? `Promedio de ${r.firstResponseSample} ticket(s)` : 'Sin respuestas en el período'}>{fmtDuration(r.firstResponseSeconds)}</span>],
    ['Sanciones', r => r.sanctions],
    ['Actividad', r => r.actions],
    ['Antigüedad', r => seniority(r.joinedAt)],
    ['Advert. vigentes', r => r.warnings ? <span className="text-[#F6B40E]">{r.warnings}</span> : 0],
  ]

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Supervisión" title="Rendimiento del staff"
        description="Datos reales del CMS (tickets, respuestas, sanciones y acciones registradas). Son apoyo a la supervisión: no hay ranking ni sanciones automáticas." />
      <StaffSubnav />

      <div className="panel-card p-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <select value={period} onChange={e => setPeriod(e.target.value as 'day' | 'week' | 'month')} className={selectCls} aria-label="Período">
          <option value="day">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option>
        </select>
        <select value={division} onChange={e => setDivision(e.target.value)} className={selectCls} aria-label="División">
          <option value="">Todas las divisiones</option>
          {(divs?.divisions ?? []).map((d: { id: number; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={member} onChange={e => setMember(e.target.value)} className={selectCls} aria-label="Miembro">
          <option value="">Todos los miembros</option>
          {(staff?.members ?? []).map((m: { id: number; username: string }) => <option key={m.id} value={m.id}>{m.username}</option>)}
        </select>
        <select value={rank} onChange={e => setRank(e.target.value)} className={selectCls} aria-label="Rango">
          <option value="">Todos los rangos</option>
          {[...STAFF_RANKS].reverse().map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </div>

      <ErrorBox error={error} />
      <section className="panel-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 text-xs text-slate-400">Desde {data ? fmtDate(data.since) : '…'} · ordenado alfabéticamente</div>
        {!data ? <Skeletons rows={4} /> : rows.length === 0 ? <EmptyState icon={BarChart3} title="Sin miembros con estos filtros" /> : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="px-4 py-3">Miembro</th><th className="px-3 py-3">División</th>
                  {metrics.map(([l]) => <th key={l} className="px-3 py-3 text-center">{l}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3"><Link href={`/directivos/staff/${r.id}`} className="font-semibold text-white hover:underline">{r.username}</Link><div className="mt-1"><RankBadge rank={r.rank} compact /></div></td>
                      <td className="px-3 py-3 max-w-[180px]"><div className="flex flex-wrap gap-1">{r.divisions.length ? r.divisions.map(d => <DivisionChip key={d.id} {...d} />) : <span className="text-slate-600">—</span>}</div></td>
                      {metrics.map(([l, f]) => <td key={l} className="px-3 py-3 text-center text-slate-200">{f(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="xl:hidden divide-y divide-white/5">
              {rows.map(r => (
                <li key={r.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/directivos/staff/${r.id}`} className="font-semibold text-white hover:underline break-all">{r.username}</Link>
                    <RankBadge rank={r.rank} compact /><StatusPill status={r.status} />
                  </div>
                  {r.divisions.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.divisions.map(d => <DivisionChip key={d.id} {...d} />)}</div>}
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {metrics.map(([l, f]) => (
                      <div key={l} className="rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-2">
                        <dt className="text-[11px] text-slate-500">{l}</dt><dd className="text-white font-semibold">{f(r)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <p className="text-xs text-slate-500 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        Aceptados: tickets asignados en el período (por la asignación actual). Resueltos: cerrados por el miembro. 1.ª respuesta: tiempo desde la apertura hasta la primera respuesta de un GM, cuando la dio este miembro.</p>
    </div>
  )
}
