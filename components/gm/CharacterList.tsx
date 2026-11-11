'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Search, Swords, Radio } from 'lucide-react'
import { fetcher, fmtAgo, Pill, OnlineDot, EmptyState, Skeletons, ErrorBox, inputCls } from '@/components/gm/ui'
import { CharacterTools, type CharacterSummary } from '@/components/gm/CharacterTools'
import { CLASS_NAMES, CLASS_COLORS } from '@/lib/gm/wow-data'
import type { GmTier } from '@/lib/gm/permissions'

type Row = CharacterSummary & { connectedSince: string | null }

export function CharacterList({ onlineOnly }: { onlineOnly: boolean }) {
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [faction, setFaction] = useState('')
  const [cls, setCls] = useState('')
  const [page, setPage] = useState(1)
  const [tools, setTools] = useState<Row | null>(null)
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1) }, 350); return () => clearTimeout(t) }, [q])

  const params = new URLSearchParams(Object.entries({ q: dq, faction, class: cls, page: String(page), online: onlineOnly ? '1' : '' }).filter(([, v]) => v))
  const ready = onlineOnly || dq.length > 0
  const { data, error, isLoading, mutate } = useSWR(ready ? `/api/gm/characters?${params}` : null, fetcher, { refreshInterval: onlineOnly ? 30000 : 0, keepPreviousData: true })
  const { data: me } = useSWR('/api/auth/me', fetcher)
  const tier = (me?.user?.gmTier ?? 1) as GmTier
  const rows: Row[] = data?.characters ?? []
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="space-y-4">
      <div className="panel-card p-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={onlineOnly ? 'Filtrar por nombre' : 'Nombre del personaje o GUID'} className={`${inputCls} pl-9`} aria-label="Buscar personaje" />
        </div>
        <select value={faction} onChange={e => { setFaction(e.target.value); setPage(1) }} className={inputCls} aria-label="Facción">
          <option value="">Ambas facciones</option><option>Alianza</option><option>Horda</option>
        </select>
        <select value={cls} onChange={e => { setCls(e.target.value); setPage(1) }} className={inputCls} aria-label="Clase">
          <option value="">Todas las clases</option>
          {Object.entries(CLASS_NAMES).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </div>

      <ErrorBox error={error} />

      <section className="panel-card overflow-hidden">
        {!ready ? (
          <EmptyState icon={Search} title="Buscá un personaje" text="Escribí al menos una letra del nombre o el GUID." />
        ) : isLoading && !data ? <Skeletons rows={5} h="h-12" /> : rows.length === 0 ? (
          <EmptyState icon={onlineOnly ? Radio : Swords} title={onlineOnly ? 'No hay jugadores conectados' : 'Sin resultados'} />
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-white/5 text-xs text-slate-400">{data.total} personajes{onlineOnly ? ' conectados' : ''}</div>
            <div className="hidden md:block table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/5">
                    <th className="px-4 py-3">Personaje</th><th className="px-3 py-3">Nivel</th><th className="px-3 py-3">Clase / raza</th>
                    <th className="px-3 py-3">Facción</th><th className="px-3 py-3">Zona</th><th className="px-3 py-3">Estado</th>
                    {onlineOnly && <th className="px-3 py-3">Conectado</th>}<th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(r => (
                    <tr key={r.guid} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-semibold" style={{ color: CLASS_COLORS[r.classId] }}>{r.name}</div>
                        <div className="text-xs text-slate-500">
                          <Link href={`/gm/cuentas/${r.accountId}`} className="hover:underline">{r.accountName ?? `#${r.accountId}`}</Link>{r.guild ? ` · <${r.guild}>` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white">{r.level}</td>
                      <td className="px-3 py-3 text-slate-300">{r.className}<div className="text-xs text-slate-500">{r.raceName}</div></td>
                      <td className="px-3 py-3">{r.faction ? <Pill color={r.faction === 'Alianza' ? '#74ACDF' : '#f87171'}>{r.faction}</Pill> : '—'}</td>
                      <td className="px-3 py-3 text-slate-300 text-xs">{r.zone}</td>
                      <td className="px-3 py-3"><OnlineDot online={r.online} /></td>
                      {onlineOnly && <td className="px-3 py-3 text-xs text-slate-400">{r.connectedSince ? fmtAgo(r.connectedSince).replace('hace ', '') : 'No disponible'}</td>}
                      <td className="px-4 py-3 text-right"><button onClick={() => setTools(r)} className="btn-primary px-3 py-1.5 text-xs">Administrar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-white/5">
              {rows.map(r => (
                <li key={r.guid} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate" style={{ color: CLASS_COLORS[r.classId] }}>{r.name} <span className="text-white/70 text-xs">Nv {r.level}</span></div>
                      <div className="text-xs text-slate-400">{r.raceName} {r.className} · {r.zone}</div>
                      <div className="text-xs text-slate-500">Cuenta {r.accountName ?? `#${r.accountId}`}{onlineOnly && r.connectedSince ? ` · conectado ${fmtAgo(r.connectedSince)}` : ''}</div>
                    </div>
                    {r.faction && <Pill color={r.faction === 'Alianza' ? '#74ACDF' : '#f87171'}>{r.faction}</Pill>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <OnlineDot online={r.online} />
                    <button onClick={() => setTools(r)} className="btn-primary px-3 py-1.5 text-xs">Administrar personaje</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {pages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Anterior</button>
          <span className="text-slate-400 self-center">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {tools && (
        <CharacterTools key={tools.guid} character={tools} tier={tier} gmName={me?.user?.username ?? 'GM'}
          onClose={() => setTools(null)} onChanged={() => mutate()} />
      )}
    </div>
  )
}
