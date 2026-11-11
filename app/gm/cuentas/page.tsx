'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Search, Users, ChevronLeft, ChevronRight, Filter, Ban, Globe } from 'lucide-react'
import { fetcher, fmtDate, fmtAgo, flag, PageHeader, Pill, EmptyState, Skeletons, ErrorBox, OnlineDot, inputCls } from '@/components/gm/ui'

const COUNTRIES: Array<[string, string]> = [
  ['AR', 'Argentina'], ['UY', 'Uruguay'], ['CL', 'Chile'], ['PY', 'Paraguay'], ['BO', 'Bolivia'], ['PE', 'Perú'],
  ['BR', 'Brasil'], ['CO', 'Colombia'], ['VE', 'Venezuela'], ['EC', 'Ecuador'], ['MX', 'México'], ['ES', 'España'], ['US', 'Estados Unidos'],
]

interface Account {
  id: number; username: string; joindate: string; lastLogin: string | null; online: boolean; banned: boolean; locked: boolean
  characters: number; gmlevel: number | null; country: { code: string; name: string } | null
}

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export default function CuentasPage() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ country: '', from: '', to: '', status: '', online: '', withCharacters: '', gm: '', sort: 'id_desc' })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const dq = useDebounced(q)
  const params = new URLSearchParams(Object.entries({ ...filters, q: dq, page: String(page) }).filter(([, v]) => v))
  const { data, error, isLoading } = useSWR(`/api/gm/accounts?${params}`, fetcher, { keepPreviousData: true })
  const accounts: Account[] = data?.accounts ?? []
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const setF = (k: keyof typeof filters, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const showGm = accounts.some(a => a.gmlevel !== null)

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Jugadores" title="Cuentas registradas"
        description="Todas las cuentas de acore_auth.account: web, consola, authserver y registros antiguos." />

      <div className="panel-card p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Buscar por ID o nombre de usuario" className={`${inputCls} pl-9`} aria-label="Buscar cuentas" />
          </div>
          <button onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters} className="btn-ghost px-3 shrink-0"><Filter className="w-4 h-4" /><span className="hidden sm:inline">Filtros</span></button>
        </div>
        {showFilters && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select value={filters.country} onChange={e => setF('country', e.target.value)} className={inputCls} aria-label="País">
              <option value="">Todos los países</option>
              <option value="unknown">País desconocido</option>
              {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{flag(c)} {n}</option>)}
            </select>
            <select value={filters.status} onChange={e => setF('status', e.target.value)} className={inputCls} aria-label="Estado">
              <option value="">Activas y baneadas</option><option value="active">Solo activas</option><option value="banned">Solo baneadas</option>
            </select>
            <select value={filters.online} onChange={e => setF('online', e.target.value)} className={inputCls} aria-label="Conexión">
              <option value="">Online y offline</option><option value="online">Online</option><option value="offline">Offline</option>
            </select>
            <select value={filters.sort} onChange={e => setF('sort', e.target.value)} className={inputCls} aria-label="Orden">
              <option value="id_desc">Más nuevas primero</option><option value="id_asc">Más antiguas primero</option>
              <option value="last_login">Último acceso</option><option value="username">Nombre A-Z</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-400 min-w-0">Desde<input type="date" value={filters.from} onChange={e => setF('from', e.target.value)} className={`${inputCls} min-w-0`} /></label>
            <label className="flex items-center gap-2 text-xs text-slate-400 min-w-0">Hasta<input type="date" value={filters.to} onChange={e => setF('to', e.target.value)} className={`${inputCls} min-w-0`} /></label>
            <label className="flex items-center gap-2 text-sm text-slate-300 px-1">
              <input type="checkbox" checked={filters.withCharacters === '1'} onChange={e => setF('withCharacters', e.target.checked ? '1' : '')} /> Con personajes
            </label>
            {showGm && (
              <select value={filters.gm} onChange={e => setF('gm', e.target.value)} className={inputCls} aria-label="Rango GM">
                <option value="">Staff y jugadores</option><option value="staff">Solo staff (GM)</option><option value="players">Solo jugadores</option>
              </select>
            )}
          </div>
        )}
        {filters.country && data && !data.geoEnabled && (
          <p className="text-xs text-[#ffe08a]"><Globe className="w-3.5 h-3.5 inline" /> GeoIP no está configurado en el servidor (GEOIP_DB_PATH): todas las cuentas figuran como “País desconocido”.</p>
        )}
      </div>

      <ErrorBox error={error} />

      <section className="panel-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 text-xs text-slate-400 flex justify-between">
          <span>{data ? `${data.total.toLocaleString('es-AR')} cuentas` : 'Cargando…'}</span>
          <span>Página {page} de {pages}</span>
        </div>
        {isLoading && !data ? <Skeletons rows={6} h="h-12" /> : accounts.length === 0 ? (
          <EmptyState icon={Users} title="Sin resultados" text="Probá con otro ID, nombre o filtro." />
        ) : (
          <>
            <div className="hidden md:block table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/5">
                    <th className="px-4 py-3">ID</th><th className="px-3 py-3">Usuario</th><th className="px-3 py-3">País</th>
                    <th className="px-3 py-3">Registro</th><th className="px-3 py-3">Último acceso</th><th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">PJs</th><th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[#F6B40E]">{a.id}</td>
                      <td className="px-3 py-3">
                        <div className="text-white font-medium">{a.username}</div>
                        <div className="flex gap-1 mt-0.5">{a.gmlevel ? <Pill color="#74ACDF">GM {a.gmlevel}</Pill> : null}<OnlineDot online={a.online} /></div>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{a.country ? `${flag(a.country.code)} ${a.country.name}` : <span className="text-slate-500">País desconocido</span>}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{fmtDate(a.joindate, false)}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{a.lastLogin ? fmtAgo(a.lastLogin) : 'Nunca'}</td>
                      <td className="px-3 py-3">{a.banned ? <Pill color="#f87171"><Ban className="w-3 h-3" /> Baneada</Pill> : a.locked ? <Pill color="#F6B40E">Bloqueada</Pill> : <Pill color="#4ade80">Activa</Pill>}</td>
                      <td className="px-3 py-3 text-slate-300">{a.characters}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/gm/cuentas/${a.id}`} className="btn-primary px-3 py-1.5 text-xs">Ver cuenta</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-white/5">
              {accounts.map(a => (
                <li key={a.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{a.username} <span className="font-mono text-xs text-[#F6B40E]">#{a.id}</span></div>
                      <div className="text-xs text-slate-400">{a.country ? `${flag(a.country.code)} ${a.country.name}` : 'País desconocido'} · {a.characters} PJ</div>
                    </div>
                    {a.banned ? <Pill color="#f87171">Baneada</Pill> : <Pill color="#4ade80">Activa</Pill>}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Registro {fmtDate(a.joindate, false)} · {a.lastLogin ? fmtAgo(a.lastLogin) : 'sin accesos'}</span>
                    <OnlineDot online={a.online} />
                  </div>
                  <Link href={`/gm/cuentas/${a.id}`} className="btn-primary w-full py-2 text-xs">Ver cuenta</Link>
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
