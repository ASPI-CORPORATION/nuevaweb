'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Users, UserCheck, PauseCircle, Network, AlertTriangle, Sparkles, Search, UserPlus, Settings2, Database,
  ArrowUpDown, ChevronDown, RefreshCw, Loader2, Info,
} from 'lucide-react'
import { fetcher, fmtDate, fmtAgo, PageHeader, StatCard, EmptyState, Skeletons, inputCls, OnlineDot } from '@/components/gm/ui'
import { StaffSubnav, RankBadge, StatusPill, DivisionChip, selectCls } from '@/components/directivos/staff/kit'
import {
  StaffActionsSheet, StaffActionModals, IncorporateModal, type MemberLite, type StaffActionKey,
} from '@/components/directivos/staff/modals'
import { STAFF_RANKS, rankByKey, MEMBER_STATUS_LABEL, type MemberStatus } from '@/lib/staff/ranks'

interface Member extends MemberLite {
  email: string | null
  lastLogin: string | null
  joinedAt: string | null
  warnings: number
  rbacRankId: number | null
  rankSource: 'rbac' | 'expediente' | null
  gmlevelMismatch: boolean
  expectedGmlevel: number | null
  divisions: NonNullable<MemberLite['divisions']>
}
interface StaffResponse {
  members: Member[]; former: Member[]
  stats: { total: number; active: number; suspended: number; divisions: number; activeWarnings: number; newThisMonth: number }
  schema: { accountAccess: string; rbac: string; rbacWritable: boolean; registered: number[]; errors: string[]; checkedAt: string }
  viewer: { id: number; username: string; isOwner: boolean }
}

type SortKey = 'rank' | 'id' | 'username' | 'joined' | 'warnings'
type SortState = { key: SortKey; dir: 1 | -1 }

function SortBtn({ k, sort, setSort, children }: { k: SortKey; sort: SortState; setSort: React.Dispatch<React.SetStateAction<SortState>>; children: React.ReactNode }) {
  return (
    <button onClick={() => setSort(s => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : (k === 'username' || k === 'id' ? 1 : -1) }))}
      className={`inline-flex items-center gap-1 uppercase tracking-wider ${sort.key === k ? 'text-[#F6B40E]' : ''}`} aria-label={`Ordenar por ${children}`}>
      {children}<ArrowUpDown className="w-3 h-3" aria-hidden="true" />
    </button>
  )
}

export default function StaffPage() {
  const router = useRouter()
  const { data, error, isLoading, isValidating, mutate } = useSWR<StaffResponse>('/api/directivos/staff', fetcher, { refreshInterval: 60_000 })
  const { data: divData } = useSWR('/api/directivos/divisiones', fetcher)
  const [q, setQ] = useState('')
  const [rank, setRank] = useState('')
  const [division, setDivision] = useState('')
  const [status, setStatus] = useState('')
  const [showFormer, setShowFormer] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [sort, setSort] = useState<SortState>({ key: 'rank', dir: -1 })
  const [sheetFor, setSheetFor] = useState<Member | null>(null)
  const [action, setAction] = useState<{ key: StaffActionKey; member: Member } | null>(null)
  const [incorporate, setIncorporate] = useState(false)

  const list = useMemo(() => {
    const src = [...(data?.members ?? []), ...(showFormer ? data?.former ?? [] : [])]
    const term = q.trim().toLowerCase()
    const out = src.filter(m =>
      (!term || m.username.toLowerCase().includes(term) || String(m.id) === term) &&
      (!rank || (rank === 'none' ? !m.rank : m.rank === rank)) &&
      (!division || m.divisions.some(d => String(d.id) === division)) &&
      (!status || m.status === status))
    const val = (m: Member): number | string => ({
      rank: (rankByKey(m.rank)?.order ?? 0) * 10 + m.gmlevel, id: m.id, username: m.username.toLowerCase(),
      joined: m.joinedAt ? new Date(m.joinedAt).getTime() : 0, warnings: m.warnings,
    })[sort.key]
    return out.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir)
  }, [data, q, rank, division, status, showFormer, sort])

  const viewer = data?.viewer ?? { id: 0, username: '', isOwner: false }
  const pick = (k: StaffActionKey) => {
    const m = sheetFor
    setSheetFor(null)
    if (!m) return
    if (k === 'expediente') router.push(`/directivos/staff/${m.id}`)
    else setAction({ key: k, member: m })
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Equipo" title="Staff y Rangos"
        description="Cuentas con nivel GM o rango administrativo efectivo en AzerothCore. Los cambios de rango se aplican en el juego y quedan auditados."
        actions={
          <div className="flex gap-2">
            <button onClick={() => mutate()} className="btn-ghost px-3 text-slate-200" aria-label="Actualizar" title="Actualizar">
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={() => setIncorporate(true)} className="btn-gold uppercase tracking-wider flex-1 sm:flex-none"><UserPlus className="w-4 h-4" /> Incorporar al staff</button>
          </div>
        } />
      <StaffSubnav />

      {error ? (
        <div className="panel-card p-4 border-red-500/30" role="alert">
          <p className="font-semibold text-red-300">No se pudo cargar el staff</p>
          <p className="text-sm text-red-200/80 mt-1 break-words">{error.message}</p>
          <p className="text-xs text-slate-500 mt-2">Esto es un error de base de datos, no significa que no haya staff. Revisá los permisos del usuario de la web sobre acore_auth.</p>
        </div>
      ) : null}

      {!data && !error ? <Skeletons rows={2} h="h-24" /> : data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard icon={Users} label="Miembros" value={data.stats.total} color="#74ACDF" />
            <StatCard icon={UserCheck} label="Activos" value={data.stats.active} color="#4ade80" />
            <StatCard icon={PauseCircle} label="Suspendidos" value={data.stats.suspended} color="#f87171" />
            <StatCard icon={Network} label="Divisiones" value={data.stats.divisions} color="#a78bfa" />
            <StatCard icon={AlertTriangle} label="Advertencias vigentes" value={data.stats.activeWarnings} color="#F6B40E" />
            <StatCard icon={Sparkles} label="Nuevos del mes" value={data.stats.newThisMonth} color="#22d3ee" />
          </div>

          <div className="panel-card px-4 py-3 text-xs">
            <button onClick={() => setShowSources(v => !v)} className="w-full flex items-center gap-2 text-left text-slate-300" aria-expanded={showSources}>
              <Database className="w-4 h-4 text-[#74ACDF] shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate">Fuentes verificadas: account_access {data.schema.accountAccess === 'ok' ? '✓' : '✗'} · {data.schema.rbacWritable ? `RBAC ✓ (${data.schema.registered.length}/10 rangos)` : 'sin RBAC'}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showSources ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {showSources && (
              <div className="mt-3 space-y-3 text-slate-400">
                <p className="break-words">{data.schema.rbac}</p>
                {data.schema.errors.map(e => <p key={e} className="text-red-300 break-words">{e}</p>)}
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full min-w-[420px] text-left">
                    <caption className="text-left text-slate-300 font-semibold pb-1 px-1">Mapa de rangos de WoW Argentina</caption>
                    <thead><tr className="text-slate-500"><th className="px-1 py-1">Rango</th><th className="px-1">Nivel GM (account_access)</th><th className="px-1">Permiso RBAC</th></tr></thead>
                    <tbody>
                      {STAFF_RANKS.map(r => (
                        <tr key={r.key} className="border-t border-white/5">
                          <td className="px-1 py-1"><RankBadge rank={r.key} compact /></td>
                          <td className="px-1">{r.gmlevel}</td>
                          <td className="px-1 font-mono">{r.rbacId} {data.schema.rbacWritable ? (data.schema.registered.includes(r.rbacId) ? '✓' : '— no registrado') : '— (sin RBAC)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>Las divisiones y advertencias son internas del CMS y nunca cambian permisos del juego. Verificado: {fmtDate(data.schema.checkedAt)}.</p>
              </div>
            )}
          </div>

          <div className="panel-card p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por usuario o ID" className={`${inputCls} pl-9`} aria-label="Buscar miembro" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <select value={rank} onChange={e => setRank(e.target.value)} className={selectCls} aria-label="Rango">
                <option value="">Todos los rangos</option>
                {[...STAFF_RANKS].reverse().map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
                <option value="none">Sin rango interno</option>
              </select>
              <select value={division} onChange={e => setDivision(e.target.value)} className={selectCls} aria-label="División">
                <option value="">Todas las divisiones</option>
                {(divData?.divisions ?? []).map((d: { id: number; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls} aria-label="Estado">
                <option value="">Todos los estados</option>
                {(['activo', 'suspendido', 'pendiente_restauracion', 'retirado'] as MemberStatus[]).map(s => <option key={s} value={s}>{MEMBER_STATUS_LABEL[s]}</option>)}
              </select>
              <label className="flex items-center gap-2 px-3 rounded-xl border border-white/10 text-sm text-slate-300 min-h-[42px]">
                <input type="checkbox" checked={showFormer} onChange={e => setShowFormer(e.target.checked)} className="accent-[#F6B40E]" />
                Incluir retirados ({data.former.length})
              </label>
            </div>
          </div>

          <section className="panel-card overflow-hidden" aria-label={`Staff (${list.length})`}>
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
              <h2 className="font-['Cinzel'] font-bold text-white">STAFF ({data.stats.total})</h2>
              {list.length !== data.stats.total && <span className="text-xs text-slate-500">{list.length} con estos filtros</span>}
            </div>
            {isLoading ? <Skeletons rows={5} /> : list.length === 0 ? (
              <EmptyState icon={Users} title={data.stats.total === 0 ? 'No hay cuentas con nivel GM' : 'Ningún miembro coincide con los filtros'}
                text={data.stats.total === 0 ? 'Ninguna cuenta tiene gmlevel > 0 ni rango RBAC en este reino. Usá "Incorporar al staff".' : undefined} />
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-slate-500 border-b border-white/5">
                        <th className="px-4 py-3"><SortBtn sort={sort} setSort={setSort} k="id">ID</SortBtn></th>
                        <th className="px-3 py-3"><SortBtn sort={sort} setSort={setSort} k="username">Usuario</SortBtn></th>
                        <th className="px-3 py-3"><SortBtn sort={sort} setSort={setSort} k="rank">Rango</SortBtn></th>
                        <th className="px-3 py-3 uppercase tracking-wider">Nivel GM</th>
                        <th className="px-3 py-3 uppercase tracking-wider">División</th>
                        <th className="px-3 py-3 uppercase tracking-wider">Estado</th>
                        <th className="px-3 py-3"><SortBtn sort={sort} setSort={setSort} k="joined">Ingreso</SortBtn></th>
                        <th className="px-3 py-3"><SortBtn sort={sort} setSort={setSort} k="warnings">Advert.</SortBtn></th>
                        <th className="px-4 py-3 text-right uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {list.map(m => (
                        <tr key={m.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono text-[#F6B40E]">{m.id}</td>
                          <td className="px-3 py-3 max-w-[200px]">
                            <Link href={`/directivos/staff/${m.id}`} className="font-semibold text-white hover:underline block truncate">{m.username}</Link>
                            <div className="text-[11px] text-slate-500 truncate">{m.directivo ? (m.directivo === 'propietario' ? 'Propietario' : 'Directivo') + ' · ' : ''}{m.online ? 'en línea' : `visto ${fmtAgo(m.lastLogin)}`}</div>
                          </td>
                          <td className="px-3 py-3"><RankBadge rank={m.rank} gmlevel={m.gmlevel} /></td>
                          <td className="px-3 py-3 text-slate-300">
                            {m.gmlevel}{m.gmlevelMismatch && <span className="ml-1 text-[#F6B40E]" title={`El rango espera nivel ${m.expectedGmlevel}`}>⚠</span>}
                          </td>
                          <td className="px-3 py-3 max-w-[200px]">
                            {m.divisions.length ? <div className="flex flex-wrap gap-1">{m.divisions.slice(0, 2).map(d => <DivisionChip key={d.id} {...d} />)}{m.divisions.length > 2 && <span className="text-xs text-slate-500">+{m.divisions.length - 2}</span>}</div> : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-3"><StatusPill status={m.status} /></td>
                          <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{m.joinedAt ? fmtDate(m.joinedAt, false) : 'Sin registro'}</td>
                          <td className="px-3 py-3 text-center">{m.warnings ? <span className="text-[#F6B40E] font-semibold">{m.warnings}</span> : <span className="text-slate-600">0</span>}</td>
                          <td className="px-4 py-3 text-right"><button onClick={() => setSheetFor(m)} className="btn-ghost px-3 py-1.5 text-xs"><Settings2 className="w-3.5 h-3.5" /> Administrar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="lg:hidden divide-y divide-white/5">
                  {list.map(m => (
                    <li key={m.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[#050A14] shrink-0" style={{ background: rankByKey(m.rank)?.color ?? '#74ACDF' }} aria-hidden="true">
                          {m.username.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link href={`/directivos/staff/${m.id}`} className="font-semibold text-white break-all hover:underline">{m.username}</Link>
                            <span className="font-mono text-xs text-[#F6B40E]">#{m.id}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <RankBadge rank={m.rank} gmlevel={m.gmlevel} compact />
                            <StatusPill status={m.status} />
                            {m.warnings > 0 && <span className="text-[11px] text-[#F6B40E]">{m.warnings} advert.</span>}
                          </div>
                          {m.divisions.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{m.divisions.map(d => <DivisionChip key={d.id} {...d} />)}</div>}
                          <div className="mt-1.5 text-[11px] text-slate-500">Nivel GM {m.gmlevel}{m.gmlevelMismatch ? ' ⚠' : ''} · <OnlineDot online={!!m.online} /></div>
                        </div>
                      </div>
                      <button onClick={() => setSheetFor(m)} className="btn-ghost w-full mt-3 py-2 text-sm"><Settings2 className="w-4 h-4" /> Administrar</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <p className="text-xs text-slate-500 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" /> Las cuentas sin rango administrativo efectivo no aparecen acá; están en Cuentas.</p>
        </>
      )}

      <StaffActionsSheet open={!!sheetFor} member={sheetFor} onClose={() => setSheetFor(null)} onPick={pick} />
      <StaffActionModals member={action?.member ?? null} action={action?.key ?? null} viewer={viewer} onClose={() => setAction(null)} onDone={() => mutate()} />
      {incorporate && <IncorporateModal open viewer={viewer} onClose={() => setIncorporate(false)} onDone={() => mutate()} />}
    </div>
  )
}
