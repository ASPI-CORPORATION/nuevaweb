'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft, IdCard, Swords, Gavel, LifeBuoy, Wrench, Mail, Globe, CalendarDays, Clock, Shield, Lock, MicOff, Mic, ShieldCheck, ChevronDown,
} from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { SanctionModal, type SanctionKind } from '@/components/gm/SanctionModal'
import { CharacterTools, type CharacterSummary } from '@/components/gm/CharacterTools'
import { fetcher, fmtDate, fmtAgo, flag, Pill, OnlineDot, TicketStatus, Priority, EmptyState, ErrorBox, Skeletons } from '@/components/gm/ui'
import { can, GM_TIER_SHORT, type GmTier } from '@/lib/gm/permissions'
import { CLASS_COLORS } from '@/lib/gm/wow-data'

type Tab = 'general' | 'personajes' | 'sanciones' | 'tickets' | 'acciones'
const TABS: Array<{ key: Tab; label: string; icon: typeof IdCard }> = [
  { key: 'general', label: 'Información general', icon: IdCard },
  { key: 'personajes', label: 'Personajes', icon: Swords },
  { key: 'sanciones', label: 'Sanciones', icon: Gavel },
  { key: 'tickets', label: 'Tickets', icon: LifeBuoy },
  { key: 'acciones', label: 'Acciones GM', icon: Wrench },
]

interface Sanction { id: string; type: string; target: string; reason: string; start: string; end: string | null; duration: string; gm: string; status: string; source: string; revokedBy?: string | null }

export default function CuentaFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, error, mutate } = useSWR(`/api/gm/accounts/${id}`, fetcher)
  const { data: me } = useSWR('/api/auth/me', fetcher)
  const [tab, setTab] = useState<Tab>('general')
  const [sanction, setSanction] = useState<SanctionKind | null>(null)
  const [tools, setTools] = useState<CharacterSummary | null>(null)
  const [confirm, setConfirm] = useState<null | 'unban' | 'unmute'>(null)
  const [busy, setBusy] = useState(false)
  const [openRow, setOpenRow] = useState<string | null>(null)

  if (error) return <div className="space-y-3"><Link href="/gm/cuentas" className="text-sm text-slate-400 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Cuentas</Link><ErrorBox error={error} /></div>
  if (!data) return <Skeletons rows={5} h="h-20" />

  const a = data.account
  const viewer = data.viewer as { id: number; tier: GmTier }
  const tier = viewer.tier
  const protectedReason = a.id === viewer.id ? 'Es tu propia cuenta: no podés aplicarte acciones GM.'
    : a.protected ? 'Los Directivos y el Propietario están protegidos.'
    : a.gmTier >= tier ? `Cuenta de staff de nivel igual o superior (${GM_TIER_SHORT[a.gmTier as GmTier]}).` : null
  // The API only returns muteUntil when the mute is still in force
  const muted = !!a.muteUntil

  const revoke = async () => {
    if (!confirm) return
    setBusy(true)
    const res = await fetch(`/api/gm/accounts/${a.id}/sanctions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: confirm }) }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    setBusy(false)
    if (!res?.ok) { notify.error(res?.status === 403 ? 'Permisos insuficientes' : 'No se pudo completar la operación', d?.error); return }
    notify.success(confirm === 'unban' ? 'Sanción revocada' : 'Silencio quitado', d.message)
    setConfirm(null)
    mutate()
  }

  const info: Array<{ icon: typeof Mail; label: string; value: React.ReactNode }> = [
    { icon: IdCard, label: 'ID de cuenta', value: <span className="font-mono text-[#F6B40E]">{a.id}</span> },
    { icon: Mail, label: 'Correo', value: a.email ?? <span className="text-slate-500">Oculto para tu nivel</span> },
    { icon: Globe, label: 'Última IP', value: a.lastIp ?? <span className="text-slate-500">Oculta para tu nivel</span> },
    { icon: Globe, label: 'País aproximado', value: a.country ? `${flag(a.country.code)} ${a.country.name}` : 'País desconocido' },
    { icon: CalendarDays, label: 'Registro', value: fmtDate(a.joindate) },
    { icon: Clock, label: 'Último inicio de sesión', value: a.lastLogin ? `${fmtDate(a.lastLogin)} (${fmtAgo(a.lastLogin)})` : 'Nunca' },
    { icon: Shield, label: 'Nivel GM', value: a.gmlevel > 0 ? `gmlevel ${a.gmlevel} · ${GM_TIER_SHORT[a.gmTier as GmTier]}` : 'Jugador' },
    { icon: Swords, label: 'Personajes', value: a.characters.length },
    { icon: Gavel, label: 'Sanciones activas', value: a.activeSanctions },
    { icon: LifeBuoy, label: 'Tickets', value: a.tickets.length },
  ]

  return (
    <div className="space-y-4">
      <Link href="/gm/cuentas" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Cuentas registradas</Link>

      <header className="panel-card p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 flex" aria-hidden="true"><span className="flex-1 bg-[#74ACDF]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#74ACDF]" /></div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#74ACDF] to-[#101F35] flex items-center justify-center font-['Cinzel'] font-black text-2xl text-white shrink-0">{a.username.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Expediente de cuenta</span>
            <h1 className="font-['Cinzel'] font-black text-2xl text-white break-words">{a.username}</h1>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <OnlineDot online={a.online} />
              {a.banned ? <Pill color="#f87171">Baneada</Pill> : a.locked ? <Pill color="#F6B40E">Bloqueada</Pill> : <Pill color="#4ade80">Activa</Pill>}
              {muted && <Pill color="#fb923c">Silenciada</Pill>}
              {a.gmlevel > 0 && <Pill color="#74ACDF">Staff · {GM_TIER_SHORT[a.gmTier as GmTier]}</Pill>}
              {a.protected && <Pill color="#F6B40E"><Lock className="w-3 h-3" /> Directivo protegido</Pill>}
            </div>
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border ${tab === t.key ? 'bg-[#74ACDF] text-[#050A14] border-[#74ACDF]' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className="panel-card p-4 sm:p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {info.map(i => (
              <div key={i.label} className="rounded-xl bg-white/[0.02] border border-white/5 px-3.5 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><i.icon className="w-3.5 h-3.5" /> {i.label}</dt>
                <dd className="text-sm text-slate-100 mt-0.5 break-words">{i.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] text-slate-500 mt-3">Datos personales: nivel de acceso {a.piiLevel}. {muted ? `Silenciada hasta ${fmtDate(a.muteUntil)}.` : ''}</p>
        </section>
      )}

      {tab === 'personajes' && (
        <section className="panel-card overflow-hidden">
          {a.characters.length === 0 ? <EmptyState icon={Swords} title="Sin personajes" text="Esta cuenta todavía no creó personajes." /> : (
            <ul className="divide-y divide-white/5">
              {a.characters.map((c: CharacterSummary & { realm: string; guild: string | null; playedHours: number }) => (
                <li key={c.guid} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-['Cinzel'] font-bold text-base" style={{ color: CLASS_COLORS[c.classId] }}>{c.name}</span>
                      <span className="text-xs text-slate-500 font-mono">GUID {c.guid}</span>
                      {c.faction && <Pill color={c.faction === 'Alianza' ? '#74ACDF' : '#f87171'}>{c.faction}</Pill>}
                      <OnlineDot online={c.online} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Nivel {c.level} · {c.raceName} {c.className} · {c.zone} · {c.realm}{c.guild ? ` · <${c.guild}>` : ''} · {c.playedHours} h jugadas</div>
                  </div>
                  <button onClick={() => setTools({ ...c, accountId: a.id, accountName: a.username })} className="btn-primary px-3 py-2 text-xs uppercase tracking-wide w-full sm:w-auto">Administrar personaje</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'sanciones' && (
        <section className="panel-card overflow-hidden">
          {a.sanctions.length === 0 ? <EmptyState icon={ShieldCheck} title="Sin sanciones registradas" text="AzerothCore no tiene baneos ni silencios para esta cuenta." /> : (
            <ul className="divide-y divide-white/5">
              {(a.sanctions as Sanction[]).map(s => (
                <li key={s.id}>
                  <button onClick={() => setOpenRow(openRow === s.id ? null : s.id)} aria-expanded={openRow === s.id} className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/[0.02]">
                    <Gavel className={`w-4 h-4 mt-0.5 shrink-0 ${s.status === 'Activa' ? 'text-red-400' : 'text-slate-500'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">{s.type}</span>
                        <Pill color={s.status === 'Activa' ? '#f87171' : s.status === 'Revocada' ? '#F6B40E' : '#94a3b8'}>{s.status}</Pill>
                        <span className="text-xs text-slate-500">{s.target}</span>
                      </span>
                      <span className="block text-sm text-slate-300 mt-0.5 break-words">{s.reason}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{fmtDate(s.start)} · {s.duration} · GM {s.gm}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openRow === s.id ? 'rotate-180' : ''}`} />
                  </button>
                  {openRow === s.id && (
                    <dl className="px-4 pb-4 pl-11 grid sm:grid-cols-2 gap-2 text-xs">
                      <div><dt className="text-slate-500">Inicio</dt><dd className="text-slate-200">{fmtDate(s.start)}</dd></div>
                      <div><dt className="text-slate-500">Fin</dt><dd className="text-slate-200">{s.end ? fmtDate(s.end) : 'Permanente'}</dd></div>
                      <div><dt className="text-slate-500">GM responsable</dt><dd className="text-slate-200">{s.gm}</dd></div>
                      <div><dt className="text-slate-500">Revocada por</dt><dd className="text-slate-200">{s.revokedBy ?? (s.status === 'Revocada' ? 'Fuera del panel (consola o juego)' : '—')}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-slate-500">Fuente</dt><dd className="text-slate-400 font-mono">{s.source}</dd></div>
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'tickets' && (
        <section className="panel-card overflow-hidden">
          {a.tickets.length === 0 ? <EmptyState icon={LifeBuoy} title="Sin tickets" /> : (
            <ul className="divide-y divide-white/5">
              {a.tickets.map((t: { id: number; subject: string; category: string; status: string; priority: string; created_at: string; assigned_name: string | null; replies: number }) => (
                <li key={t.id}>
                  <Link href={`/gm/soporte/${t.id}`} className="p-4 flex items-start gap-3 hover:bg-white/[0.02]">
                    <span className="font-mono text-xs text-[#F6B40E] mt-0.5">#{t.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap gap-1.5"><TicketStatus status={t.status} /><Priority priority={t.priority === 'Media' ? 'Normal' : t.priority} /></span>
                      <span className="block text-sm text-white mt-1 break-words">{t.subject}</span>
                      <span className="block text-xs text-slate-500">{t.category} · {fmtDate(t.created_at)} · {t.replies} mensajes · {t.assigned_name ? `GM ${t.assigned_name}` : 'sin asignar'}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'acciones' && (
        <section className="space-y-3">
          {protectedReason && (
            <div className="rounded-xl border border-[#F6B40E]/35 bg-[#F6B40E]/10 px-4 py-3 text-sm text-[#ffe08a] flex gap-2"><Lock className="w-4 h-4 shrink-0 mt-0.5" /> {protectedReason}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Gavel className="w-4 h-4 text-red-400" /> Sanción de cuenta</h3>
              {can(tier, 'banAccountTemp') ? (
                <>
                  <button disabled={!!protectedReason || a.banned} onClick={() => setSanction('ban_account')} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-white bg-red-600 hover:bg-red-500 disabled:opacity-40">Banear cuenta</button>
                  <button disabled={!!protectedReason || !a.banned} onClick={() => setConfirm('unban')} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border border-white/15 text-slate-200 hover:bg-white/5 disabled:opacity-40">Desbanear cuenta</button>
                  {!can(tier, 'unbanAny') && <p className="text-[11px] text-slate-500">Como GM 2 solo podés revocar sanciones que aplicaste vos.</p>}
                </>
              ) : <p className="text-xs text-slate-500">Las sanciones de cuenta requieren GM nivel 2 o superior.</p>}
            </div>
            <div className="panel-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><MicOff className="w-4 h-4 text-orange-400" /> Silencio (mute)</h3>
              {can(tier, 'mute') ? (
                <>
                  <button disabled={!!protectedReason || a.characters.length === 0} onClick={() => setSanction('mute')} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-40">Silenciar</button>
                  <button disabled={!!protectedReason || a.characters.length === 0} onClick={() => setConfirm('unmute')} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border border-white/15 text-slate-200 hover:bg-white/5 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Quitar silencio</button>
                </>
              ) : <p className="text-xs text-slate-500">El silencio requiere GM nivel 2 o superior.</p>}
            </div>
          </div>
          <div className="panel-card p-4">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Wrench className="w-4 h-4 text-[#74ACDF]" /> Herramientas de personaje</h3>
            {a.characters.length === 0 ? <p className="text-xs text-slate-500">La cuenta no tiene personajes.</p> : (
              <div className="flex flex-wrap gap-2">
                {a.characters.map((c: CharacterSummary) => (
                  <button key={c.guid} onClick={() => setTools({ ...c, accountId: a.id, accountName: a.username })} className="btn-ghost px-3 py-2 text-xs" style={{ color: CLASS_COLORS[c.classId] }}>{c.name}</button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {sanction && (
        <SanctionModal open kind={sanction} tier={tier} gmName={me?.user?.username ?? 'GM'}
          target={{ label: a.username, accountId: a.id, characters: a.characters }}
          onClose={() => setSanction(null)} onDone={() => mutate()} />
      )}
      {tools && (
        <CharacterTools key={tools.guid} character={tools} tier={tier} gmName={me?.user?.username ?? 'GM'} protectedReason={protectedReason}
          onClose={() => setTools(null)} onChanged={() => mutate()} />
      )}
      <ConfirmDialog
        open={!!confirm}
        warning
        title={confirm === 'unban' ? 'Desbanear cuenta' : 'Quitar silencio'}
        message={confirm === 'unban' ? `Se levantará el baneo activo de ${a.username}.` : `${a.username} podrá volver a hablar en el juego.`}
        confirmLabel="Confirmar"
        busy={busy}
        onConfirm={revoke}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
