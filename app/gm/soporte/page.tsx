'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { LifeBuoy, Search, ChevronRight, UserCheck, MessageCircleReply } from 'lucide-react'
import { fetcher, fmtAgo, fmtDate, PageHeader, TicketStatus, Priority, EmptyState, Skeletons, ErrorBox, inputCls } from '@/components/gm/ui'

const TABS = [
  { key: 'activos', label: 'Activos' },
  { key: 'Abierto', label: 'Abiertos' },
  { key: 'Aceptado', label: 'Aceptados' },
  { key: 'En Revisión', label: 'En revisión' },
  { key: 'Rechazado', label: 'Rechazados' },
  { key: 'Cerrado', label: 'Cerrados' },
  { key: '', label: 'Todos' },
]

interface Row {
  id: number; account_name: string | null; character_name: string | null; subject: string; category: string
  status: string; priority: string; assigned_to: number | null; assigned_name: string | null; created_at: string
  last_reply_at: string | null; last_author: string | null; waitingPlayer: boolean
}

export default function SoportePage() {
  const [status, setStatus] = useState('activos')
  const [priority, setPriority] = useState('')
  const [gm, setGm] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const params = new URLSearchParams(Object.entries({ status, priority, gm, from, to, q }).filter(([, v]) => v))
  const { data, error, isLoading } = useSWR(`/api/gm/tickets?${params}`, fetcher, { refreshInterval: 15000, keepPreviousData: true })
  const tickets: Row[] = data?.tickets ?? []
  const counts: Record<string, number> = data?.counts ?? {}
  const activeCount = (counts['Abierto'] ?? 0) + (counts['Aceptado'] ?? 0) + (counts['En Revisión'] ?? 0)

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Soporte" title="Centro de soporte" description="Atendé las solicitudes de los jugadores. Un ticket aceptado queda asignado a un solo GM." />

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Estado de tickets">
        {TABS.map(t => {
          const n = t.key === 'activos' ? activeCount : t.key ? counts[t.key] : undefined
          return (
            <button key={t.key} role="tab" aria-selected={status === t.key} onClick={() => setStatus(t.key)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${status === t.key ? 'bg-[#74ACDF] text-[#050A14] border-[#74ACDF]' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
              {t.label}{n != null && <span className="ml-1.5 text-xs opacity-75">{n}</span>}
            </button>
          )
        })}
      </div>

      <div className="panel-card p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ID, asunto, usuario o personaje" className={`${inputCls} pl-9`} aria-label="Buscar tickets" />
        </div>
        <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls} aria-label="Prioridad">
          <option value="">Todas las prioridades</option>
          {['Urgente', 'Alta', 'Normal', 'Baja'].map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={gm} onChange={e => setGm(e.target.value)} className={inputCls} aria-label="GM asignado">
          <option value="">Cualquier GM</option>
          <option value="me">Asignados a mí</option>
          <option value="none">Sin asignar</option>
          {(data?.gms ?? []).map((g: { id: number; username: string }) => <option key={g.id} value={g.id}>{g.username}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={`${inputCls} min-w-0`} aria-label="Desde" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={`${inputCls} min-w-0`} aria-label="Hasta" />
        </div>
      </div>

      <ErrorBox error={error} />

      <section className="panel-card overflow-hidden">
        {isLoading && !data ? <Skeletons rows={5} /> : tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No hay tickets con estos filtros" text="Cuando los jugadores abran solicitudes, aparecerán acá." />
        ) : (
          <>
            <div className="hidden lg:block table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/5">
                    <th className="px-4 py-3">ID</th><th className="px-3 py-3">Usuario / personaje</th><th className="px-3 py-3">Asunto</th>
                    <th className="px-3 py-3">Estado</th><th className="px-3 py-3">Prioridad</th><th className="px-3 py-3">GM</th>
                    <th className="px-3 py-3">Última respuesta</th><th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[#F6B40E]">#{t.id}</td>
                      <td className="px-3 py-3"><div className="text-white">{t.account_name ?? '—'}</div><div className="text-xs text-slate-500">{t.character_name ?? 'Sin personaje'}</div></td>
                      <td className="px-3 py-3 max-w-[280px]"><Link href={`/gm/soporte/${t.id}`} className="block text-slate-100 truncate hover:text-[#cfe6f8] hover:underline">{t.subject}</Link><div className="text-xs text-slate-500">{t.category} · {fmtDate(t.created_at)}</div></td>
                      <td className="px-3 py-3"><TicketStatus status={t.status} /></td>
                      <td className="px-3 py-3"><Priority priority={t.priority} /></td>
                      <td className="px-3 py-3 text-slate-300">{t.assigned_name ?? <span className="text-slate-500">Sin asignar</span>}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {t.last_reply_at ? <>{fmtAgo(t.last_reply_at)}<div>{t.waitingPlayer ? 'esperando al jugador' : <span className="text-[#F6B40E]">responde {t.last_author}</span>}</div></> : <span className="text-[#F6B40E]">Sin respuesta</span>}
                      </td>
                      <td className="px-4 py-3 text-right"><Link href={`/gm/soporte/${t.id}`} className="btn-ghost px-3 py-1.5 text-xs">Abrir</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="lg:hidden divide-y divide-white/5">
              {tickets.map(t => (
                <li key={t.id}>
                  <Link href={`/gm/soporte/${t.id}`} className="flex items-start gap-3 p-4 hover:bg-white/[0.02]">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs text-[#F6B40E]">#{t.id}</span>
                        <TicketStatus status={t.status} /><Priority priority={t.priority} />
                      </div>
                      <div className="text-white font-medium break-words">{t.subject}</div>
                      <div className="text-xs text-slate-400">{t.account_name}{t.character_name ? ` · ${t.character_name}` : ''} · {fmtAgo(t.created_at)}</div>
                      <div className="text-xs flex items-center gap-3 text-slate-500">
                        <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> {t.assigned_name ?? 'Sin asignar'}</span>
                        {!t.waitingPlayer && <span className="inline-flex items-center gap-1 text-[#F6B40E]"><MessageCircleReply className="w-3.5 h-3.5" /> por responder</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 shrink-0 self-center" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
