'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Search, ChevronLeft, ChevronRight, Users, SlidersHorizontal, UserPlus, FileText, ExternalLink, Crown } from 'lucide-react'
import { fetcher, fmtDate, fmtAgo, flag, PageHeader, EmptyState, Skeletons, ErrorBox, Pill, OnlineDot, inputCls } from '@/components/gm/ui'
import { RankBadge, StatusPill, DivisionChip, InfoRow, Sheet, selectCls } from '@/components/directivos/staff/kit'
import { IncorporateModal } from '@/components/directivos/staff/modals'
import { CLASS_NAMES } from '@/lib/gm/wow-data'
import type { MemberStatus, RankKey } from '@/lib/staff/ranks'

interface Account {
  id: number; username: string; joindate: string; lastLogin: string | null; online: boolean; banned: boolean; characters: number
  gmlevel: number | null; country: { code: string; name: string } | null; directivo: string | null
  staff: { rank: RankKey | null; status: MemberStatus; divisions: Array<{ id: number; name: string; color: string }>; directivo: string | null } | null
}

export default function DirectivosCuentasPage() {
  const [f, setF] = useState({ q: '', gmlevel: '', gm: '', status: '', online: '', country: '', withCharacters: '', sort: 'id_desc' })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [detail, setDetail] = useState<Account | null>(null)
  const [incorporate, setIncorporate] = useState<number | null>(null)
  const params = new URLSearchParams(Object.entries({ ...f, page: String(page), pageSize: '25' }).filter(([, v]) => v))
  const { data, error, isLoading, mutate } = useSWR(`/api/directivos/cuentas?${params}`, fetcher, { keepPreviousData: true })
  const { data: me } = useSWR('/api/directivos/staff', fetcher)
  const accounts: Account[] = data?.accounts ?? []
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const set = (k: keyof typeof f, v: string) => { setF(x => ({ ...x, [k]: v })); setPage(1) }
  const viewer = me?.viewer ?? { username: '', isOwner: false }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Administración" title="Cuentas"
        description="Todas las cuentas registradas en acore_auth.account (CMS, consola, authserver o herramientas externas), con su situación en el staff." />

      <div className="panel-card p-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
            <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Buscar por ID o usuario" className={`${inputCls} pl-9`} aria-label="Buscar cuenta" />
          </div>
          <button onClick={() => setShowFilters(v => !v)} className="btn-ghost px-3 shrink-0" aria-expanded={showFilters} aria-label="Filtros">
            <SlidersHorizontal className="w-4 h-4" /><span className="hidden sm:inline">Filtros</span>
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={f.gmlevel} onChange={e => set('gmlevel', e.target.value)} className={selectCls} aria-label="Nivel GM">
              <option value="">Cualquier nivel GM</option>
              <option value="0">Jugadores (0)</option><option value="1">Nivel 1</option><option value="2">Nivel 2</option><option value="3">Nivel 3</option>
            </select>
            <select value={f.gm} onChange={e => set('gm', e.target.value)} className={selectCls} aria-label="Staff">
              <option value="">Staff y jugadores</option><option value="staff">Solo con nivel GM</option><option value="players">Solo jugadores</option>
            </select>
            <select value={f.status} onChange={e => set('status', e.target.value)} className={selectCls} aria-label="Estado">
              <option value="">Activas y baneadas</option><option value="active">Activas</option><option value="banned">Baneadas</option>
            </select>
            <select value={f.online} onChange={e => set('online', e.target.value)} className={selectCls} aria-label="Conexión">
              <option value="">Conectadas o no</option><option value="online">En línea</option><option value="offline">Desconectadas</option>
            </select>
            <input value={f.country} onChange={e => set('country', e.target.value.slice(0, 7))} placeholder="País (AR, unknown)" className={inputCls} aria-label="País" disabled={data && !data.geoEnabled} />
            <select value={f.withCharacters} onChange={e => set('withCharacters', e.target.value)} className={selectCls} aria-label="Personajes">
              <option value="">Con o sin personajes</option><option value="1">Con personajes</option>
            </select>
            <select value={f.sort} onChange={e => set('sort', e.target.value)} className={selectCls} aria-label="Orden">
              <option value="id_desc">Más recientes</option><option value="id_asc">Más antiguas</option><option value="last_login">Último acceso</option><option value="username">Nombre A-Z</option>
            </select>
            {data && !data.geoEnabled && <p className="col-span-2 text-xs text-slate-500 self-center">País no disponible: falta GEOIP_DB_PATH.</p>}
          </div>
        )}
      </div>

      <ErrorBox error={error} />
      <section className="panel-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 text-sm text-slate-300">{data ? `${data.total.toLocaleString('es-AR')} cuentas` : 'Cargando…'}</div>
        {isLoading && !data ? <Skeletons rows={6} /> : accounts.length === 0 ? <EmptyState icon={Users} title="No hay cuentas con estos filtros" /> : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="px-4 py-3">ID</th><th className="px-3 py-3">Usuario</th><th className="px-3 py-3">País</th><th className="px-3 py-3">Nivel GM</th>
                  <th className="px-3 py-3">Staff</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Registro</th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[#F6B40E]">{a.id}</td>
                      <td className="px-3 py-3"><div className="text-white font-medium">{a.username}</div><div className="text-[11px] text-slate-500">{a.characters} personaje{a.characters === 1 ? '' : 's'} · {a.online ? 'en línea' : `visto ${fmtAgo(a.lastLogin)}`}</div></td>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{a.country ? `${flag(a.country.code)} ${a.country.name}` : <span className="text-slate-500">País desconocido</span>}</td>
                      <td className="px-3 py-3 text-slate-300">{a.gmlevel ?? 0}</td>
                      <td className="px-3 py-3"><StaffCell a={a} /></td>
                      <td className="px-3 py-3">{a.banned ? <Pill color="#f87171">Baneada</Pill> : <Pill color="#4ade80">Activa</Pill>}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(a.joindate, false)}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => setDetail(a)} className="btn-ghost px-3 py-1.5 text-xs">Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="lg:hidden divide-y divide-white/5">
              {accounts.map(a => (
                <li key={a.id}>
                  <button onClick={() => setDetail(a)} className="w-full text-left p-4 hover:bg-white/[0.02]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-white break-all">{a.username}</span>
                      <span className="font-mono text-xs text-[#F6B40E]">#{a.id}</span>
                      {a.banned && <Pill color="#f87171">Baneada</Pill>}
                    </div>
                    <div className="mt-1.5"><StaffCell a={a} /></div>
                    <div className="mt-1.5 text-[11px] text-slate-500">{a.country ? `${flag(a.country.code)} ${a.country.name}` : 'País desconocido'} · GM {a.gmlevel ?? 0} · {a.characters} pj · {a.online ? 'en línea' : fmtAgo(a.lastLogin)}</div>
                  </button>
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

      {detail && <AccountSheet account={detail} onClose={() => setDetail(null)} onIncorporate={id => { setDetail(null); setIncorporate(id) }} />}
      {incorporate && <IncorporateModal open initialId={incorporate} viewer={viewer} onClose={() => setIncorporate(null)} onDone={() => mutate()} />}
    </div>
  )
}

function StaffCell({ a }: { a: Account }) {
  if (!a.staff) return a.directivo ? <Pill color="#F6B40E"><Crown className="w-3 h-3" /> Directivo</Pill> : <span className="text-xs text-slate-500">No pertenece</span>
  return (
    <div className="flex flex-wrap items-center gap-1">
      <RankBadge rank={a.staff.rank} gmlevel={a.gmlevel ?? 0} compact />
      {a.staff.status !== 'activo' && <StatusPill status={a.staff.status} />}
      {a.staff.divisions.slice(0, 2).map(d => <DivisionChip key={d.id} name={d.name} color={d.color} />)}
      {a.directivo && <Pill color="#F6B40E"><Crown className="w-3 h-3" /></Pill>}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function AccountSheet({ account, onClose, onIncorporate }: { account: Account; onClose: () => void; onIncorporate: (id: number) => void }) {
  const { data, error } = useSWR(`/api/gm/accounts/${account.id}`, fetcher)
  const d = data?.account
  const isStaff = account.staff && account.staff.status !== 'retirado'
  return (
    <Sheet open wide title={account.username} subtitle={`Cuenta #${account.id}`} onClose={onClose} tone="celeste"
      footer={<>
        <Link href={`/gm/cuentas/${account.id}`} className="btn-ghost"><ExternalLink className="w-4 h-4" /> Expediente GM completo</Link>
        {isStaff
          ? <Link href={`/directivos/staff/${account.id}`} className="btn-gold uppercase tracking-wider"><FileText className="w-4 h-4" /> Expediente de staff</Link>
          : (account.gmlevel ?? 0) === 0 && <button onClick={() => onIncorporate(account.id)} className="btn-gold uppercase tracking-wider"><UserPlus className="w-4 h-4" /> Incorporar al staff</button>}
      </>}>
      <ErrorBox error={error} />
      {!d ? <Skeletons rows={3} h="h-12" /> : (
        <div className="space-y-4">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div>
              <InfoRow label="Correo">{d.email ?? '—'}</InfoRow>
              <InfoRow label="Última IP">{d.lastIp ?? '—'}</InfoRow>
              <InfoRow label="País">{d.country ? `${flag(d.country.code)} ${d.country.name}` : 'País desconocido'}</InfoRow>
              <InfoRow label="Registro">{fmtDate(d.joindate, false)}</InfoRow>
            </div>
            <div>
              <InfoRow label="Conexión"><OnlineDot online={d.online} /></InfoRow>
              <InfoRow label="Último acceso">{d.lastLogin ? fmtAgo(d.lastLogin) : 'Nunca'}</InfoRow>
              <InfoRow label="Nivel GM">{d.gmlevel}</InfoRow>
              <InfoRow label="Sanciones activas">{d.activeSanctions} {d.banned && <Pill color="#f87171">Baneada</Pill>}</InfoRow>
            </div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Staff</h3>
            {account.staff ? (
              <div className="flex flex-wrap items-center gap-1.5"><RankBadge rank={account.staff.rank} gmlevel={d.gmlevel} /><StatusPill status={account.staff.status} />
                {account.staff.divisions.map(x => <DivisionChip key={x.id} name={x.name} color={x.color} />)}</div>
            ) : <p className="text-sm text-slate-400">No pertenece al staff{account.directivo ? ' (es Directivo: el acceso al panel se gestiona aparte)' : ''}.</p>}
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Personajes ({d.characters.length})</h3>
            {d.characters.length === 0 ? <p className="text-sm text-slate-500">Sin personajes.</p> : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {d.characters.map((c: any) => (
                  <li key={c.guid} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2 text-sm">
                    <span className="text-white truncate">{c.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">Nv {c.level} · {CLASS_NAMES[c.class] ?? c.className ?? ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2"><div className="text-lg font-bold text-white">{d.sanctions.length}</div><div className="text-[11px] text-slate-400">Sanciones registradas</div></div>
            <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2"><div className="text-lg font-bold text-white">{d.tickets.length}</div><div className="text-[11px] text-slate-400">Tickets</div></div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
