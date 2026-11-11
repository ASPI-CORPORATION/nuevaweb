'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import {
  ArrowLeft, ArrowUpCircle, ArrowDownCircle, UserMinus, AlertTriangle, PauseCircle, Network, Settings2, UserPlus,
  ShieldAlert, RotateCcw, PlayCircle, Pencil, Ticket, Activity, FileText, Crown,
} from 'lucide-react'
import { fetcher, fmtDate, fmtAgo, Pill, EmptyState, Skeletons, ErrorBox, OnlineDot, TicketStatus, inputCls } from '@/components/gm/ui'
import { RankBadge, StatusPill, DivisionChip, InfoRow, Sheet, Field, FormError, runAction, selectCls, textareaCls } from '@/components/directivos/staff/kit'
import {
  StaffActionsSheet, StaffActionModals, ReasonModal, DivisionAssignModal, type MemberLite, type StaffActionKey,
} from '@/components/directivos/staff/modals'
import {
  rankByKey, gmlevelLabel, activityLabel, DIVISION_ROLES, DIVISION_ROLE_LABEL, WARNING_TYPE_LABEL, WARNING_TYPE_SHORT,
  WARNING_TYPE_COLOR, WARNING_STATUS_LABEL, WARNING_STATUS_COLOR, SUSPENSION_SCOPE_LABEL, SUSPENSION_STATE_LABEL,
  type DivisionRole, type WarningStatus, type WarningType, type SuspensionState,
} from '@/lib/staff/ranks'

const TABS = [
  { key: 'general', label: 'Información general' },
  { key: 'rango', label: 'Rango y permisos' },
  { key: 'division', label: 'División asignada' },
  { key: 'rendimiento', label: 'Rendimiento' },
  { key: 'advertencias', label: 'Advertencias' },
  { key: 'historial', label: 'Historial administrativo' },
  { key: 'actividad', label: 'Actividad y tickets' },
] as const
type TabKey = (typeof TABS)[number]['key']

/* eslint-disable @typescript-eslint/no-explicit-any */
type File = any

const RESULT_COLOR: Record<string, string> = { ok: '#4ade80', error: '#f87171', denegado: '#F6B40E' }

export default function StaffFilePage() {
  const { id } = useParams<{ id: string }>()
  const { data, error, mutate } = useSWR<File>(`/api/directivos/staff/${id}`, fetcher)
  const [tab, setTab] = useState<TabKey>('general')
  const [sheet, setSheet] = useState(false)
  const [action, setAction] = useState<StaffActionKey | null>(null)

  if (error) return <div className="space-y-4"><BackLink /><ErrorBox error={error} /></div>
  if (!data) return <div className="space-y-4"><BackLink /><Skeletons rows={4} h="h-24" /></div>

  const m = data.member
  const member: MemberLite = { ...m, can: data.can }
  const viewer = data.viewer
  const can = data.can.canManage
  const rank = rankByKey(m.rank)
  const blockedRank = m.status === 'suspendido' || m.status === 'pendiente_restauracion'
  const isStaff = m.status !== 'sin_permisos' && m.status !== 'retirado'
  const refresh = () => mutate()

  const quick: Array<{ key: StaffActionKey; label: string; icon: typeof ArrowUpCircle; show: boolean; danger?: boolean }> = [
    { key: 'ascender', label: 'Ascender GM', icon: ArrowUpCircle, show: !!rank && rank.order < 10 && !blockedRank },
    { key: 'degradar', label: 'Degradar GM', icon: ArrowDownCircle, show: !!rank && rank.order > 1 && !blockedRank },
    { key: 'asignar', label: 'Asignar rango', icon: UserPlus, show: !rank && isStaff && !blockedRank },
    { key: 'advertir', label: 'Emitir advertencia', icon: AlertTriangle, show: isStaff },
    { key: 'suspender', label: 'Suspender staff', icon: PauseCircle, show: m.status === 'activo', danger: true },
    { key: 'retirar', label: 'Retirar del staff', icon: UserMinus, show: isStaff, danger: true },
  ]

  return (
    <div className="space-y-5">
      <BackLink />

      <header className="panel-card p-4 sm:p-6 relative overflow-hidden" style={{ borderColor: `${rank?.color ?? '#74ACDF'}40` }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: rank?.color ?? '#74ACDF' }} aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-['Cinzel'] font-black text-2xl text-[#050A14] shrink-0" style={{ background: rank?.color ?? '#74ACDF' }} aria-hidden="true">
            {m.username.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <span className="eyebrow">Expediente de staff</span>
            <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white break-all">{m.username}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs text-[#F6B40E]">ID {m.id}</span>
              <RankBadge rank={m.rank} gmlevel={m.gmlevel} />
              <StatusPill status={m.status} />
              {m.directivo && <Pill color="#F6B40E"><Crown className="w-3 h-3" /> {m.directivo === 'propietario' ? 'Propietario' : 'Directivo'}</Pill>}
              <OnlineDot online={m.online} />
            </div>
            {m.divisions.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.divisions.map((d: any) => <DivisionChip key={d.id} {...d} />)}</div>}
          </div>
          <button onClick={() => setSheet(true)} className="btn-gold uppercase tracking-wider sm:hidden"><Settings2 className="w-4 h-4" /> Administrar</button>
        </div>
        {!can && data.can.reason && <p className="relative mt-4 px-3 py-2 rounded-xl border border-[#F6B40E]/25 bg-[#F6B40E]/[0.06] text-xs text-[#F6B40E]">{data.can.reason}</p>}
        {can && (
          <div className="relative mt-4 hidden sm:flex flex-wrap gap-2">
            {quick.filter(q => q.show).map(q => (
              <button key={q.key} onClick={() => setAction(q.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${q.danger ? 'border-red-500/30 text-red-300 hover:bg-red-500/10' : 'border-[#F6B40E]/30 text-[#F6B40E] hover:bg-[#F6B40E]/10'}`}>
                <q.icon className="w-4 h-4" /> {q.label}
              </button>
            ))}
            {isStaff && <button onClick={() => setAction('division')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#74ACDF]/30 text-[#74ACDF] hover:bg-[#74ACDF]/10"><Network className="w-4 h-4" /> Asignar división</button>}
          </div>
        )}
      </header>

      <SuspensionBanner data={data} onDone={refresh} />

      <div className="-mx-1 overflow-x-auto" role="tablist" aria-label="Secciones del expediente">
        <div className="flex gap-1.5 px-1 pb-1 min-w-max">
          {TABS.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border whitespace-nowrap ${tab === t.key ? 'bg-[#74ACDF] text-[#050A14] border-[#74ACDF]' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
              {t.label}{t.key === 'advertencias' && data.stats.warningsActive > 0 ? ` (${data.stats.warningsActive})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {tab === 'general' && <GeneralTab data={data} can={can} onDone={refresh} />}
        {tab === 'rango' && <RankTab data={data} />}
        {tab === 'division' && <DivisionTab data={data} can={can || (data.can.isOwner && !!m.directivo)} onAssign={() => setAction('division')} onDone={refresh} />}
        {tab === 'rendimiento' && <PerformanceTab id={m.id} />}
        {tab === 'advertencias' && <WarningsTab data={data} can={can} onIssue={() => setAction('advertir')} onDone={refresh} />}
        {tab === 'historial' && <HistoryTab data={data} />}
        {tab === 'actividad' && <ActivityTab data={data} />}
      </div>

      <StaffActionsSheet open={sheet} member={member} onClose={() => setSheet(false)} onPick={k => { setSheet(false); if (k !== 'expediente') setAction(k) }} />
      {action === 'division'
        ? <DivisionAssignModal open member={member} onClose={() => setAction(null)} onDone={refresh} />
        : <StaffActionModals member={member} action={action} viewer={viewer} onClose={() => setAction(null)} onDone={refresh} />}
    </div>
  )
}

function BackLink() {
  return <Link href="/directivos/staff" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Staff y Rangos</Link>
}

function Card({ title, icon: Icon, children, actions }: { title: string; icon?: typeof FileText; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-white flex items-center gap-2 min-w-0">{Icon && <Icon className="w-4 h-4 text-[#74ACDF] shrink-0" />}<span className="truncate">{title}</span></h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

function SuspensionBanner({ data, onDone }: { data: File; onDone: () => void }) {
  const [modal, setModal] = useState<{ kind: 'lift' | 'restore'; s: any } | null>(null)
  const open = (data.suspensions as any[]).filter(s =>
    (s.state === 'vigente' || s.state === 'programada') ||
    (s.scope === 'juego' && !s.restored_at && s.prev_gmlevel > 0 && data.member.status === 'pendiente_restauracion'))
  if (!open.length) return null
  return (
    <>
      {open.map(s => {
        const active = s.state === 'vigente' || s.state === 'programada'
        return (
          <div key={s.id} className={`panel-card p-4 ${active ? 'border-red-500/30' : 'border-[#F6B40E]/35'}`} role="status">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <ShieldAlert className={`w-6 h-6 shrink-0 ${active ? 'text-red-400' : 'text-[#F6B40E]'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-white font-semibold">
                  {active ? `${SUSPENSION_SCOPE_LABEL[s.scope as 'interna' | 'juego']} · ${SUSPENSION_STATE_LABEL[s.state as SuspensionState]}` : 'Suspensión terminada: permisos pendientes de restaurar'}
                </p>
                <p className="text-slate-400 break-words">
                  {active ? `Desde ${fmtDate(s.starts_at)} hasta ${fmtDate(s.ends_at)}. ` : `Rango previo: ${s.prevRankName ?? `nivel ${s.prev_gmlevel}`}. Los permisos no se restauran solos. `}
                  Motivo: {s.reason}
                </p>
              </div>
              {data.can.canManage && (
                <div className="flex gap-2">
                  {active
                    ? <button onClick={() => setModal({ kind: 'lift', s })} className="btn-ghost text-xs"><PlayCircle className="w-4 h-4" /> Levantar</button>
                    : <button onClick={() => setModal({ kind: 'restore', s })} className="btn-gold text-xs uppercase"><RotateCcw className="w-4 h-4" /> Restaurar permisos</button>}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {modal && (
        <ReasonModal open title={modal.kind === 'lift' ? 'Levantar suspensión' : 'Restaurar permisos'} subtitle={data.member.username}
          text={modal.kind === 'lift'
            ? (modal.s.scope === 'juego' ? 'La suspensión termina ahora. Los permisos del juego NO se restauran automáticamente.' : 'La suspensión termina ahora y vuelve a tener acceso a las herramientas del Panel GM.')
            : `Se volverá a aplicar ${modal.s.prevRankName ?? `el nivel GM ${modal.s.prev_gmlevel}`} después de verificar que la cuenta exista, no esté baneada y no tenga otros permisos asignados.`}
          confirmLabel={modal.kind === 'lift' ? 'Levantar suspensión' : 'Restaurar permisos'}
          onClose={() => setModal(null)}
          onSubmit={async reason => {
            const r = await runAction(`/api/directivos/staff/suspensiones/${modal.s.id}`, 'POST', { action: modal.kind, reason })
            if (!r.ok) return r.data.error ?? 'No se pudo completar la acción.'
            onDone(); return null
          }} />
      )}
    </>
  )
}

function GeneralTab({ data, can, onDone }: { data: File; can: boolean; onDone: () => void }) {
  const m = data.member, s = data.stats
  const [edit, setEdit] = useState(false)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Datos de la cuenta" icon={FileText} actions={can && <button onClick={() => setEdit(true)} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /> Editar</button>}>
        <InfoRow label="ID de cuenta"><span className="font-mono">{m.id}</span></InfoRow>
        <InfoRow label="Usuario (AzerothCore)">{m.username}</InfoRow>
        <InfoRow label="Correo">{m.email || '—'}</InfoRow>
        <InfoRow label="Rango"><RankBadge rank={m.rank} gmlevel={m.gmlevel} /></InfoRow>
        <InfoRow label="Nivel GM efectivo">{gmlevelLabel(m.gmlevel)}</InfoRow>
        <InfoRow label="División">{m.divisions.length ? m.divisions.map((d: any) => d.name).join(', ') : 'Sin división'}</InfoRow>
        <InfoRow label="Ingreso al staff">{m.joinedAt ? fmtDate(m.joinedAt, false) : 'No registrado (anterior a los expedientes)'}</InfoRow>
        <InfoRow label="Incorporado por">{m.joinedByName ?? '—'}</InfoRow>
        <InfoRow label="Última conexión">{m.lastLogin ? `${fmtDate(m.lastLogin)} (${fmtAgo(m.lastLogin)})` : "Nunca"}</InfoRow>
        <InfoRow label="Estado"><StatusPill status={m.status} /></InfoRow>
        {data.profile?.status === 'retirado' && <InfoRow label="Retirado">{fmtDate(data.profile.retired_at)} por {data.profile.retiredByName} · {data.profile.retire_reason}</InfoRow>}
      </Card>
      <Card title="Resumen de actividad" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ['Tickets atendidos', s.ticketsAttended], ['Tickets resueltos', s.ticketsResolved], ['Tickets pendientes', s.ticketsPending],
            ['Acciones GM registradas', s.gmActions], ['Sanciones aplicadas', s.sanctionsApplied],
            ['Advertencias vigentes', `${s.warningsActive} / ${s.warningsTotal}`], ['Sanciones administrativas', s.adminSanctions],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
              <div className="text-xl font-bold text-white">{v}</div>
              <div className="text-[11px] text-slate-400 leading-tight">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Datos de cms_tickets, cms_gm_logs, cms_gm_sanctions y los registros del staff. Si no hay registros, se muestra 0.</p>
        {data.profile?.notes && <div className="mt-3 text-sm"><div className="text-slate-400 mb-1">Observaciones internas</div><p className="text-slate-200 whitespace-pre-wrap break-words">{data.profile.notes}</p></div>}
      </Card>
      {edit && <ProfileEditModal data={data} onClose={() => setEdit(false)} onDone={onDone} />}
    </div>
  )
}

function ProfileEditModal({ data, onClose, onDone }: { data: File; onClose: () => void; onDone: () => void }) {
  const [joined, setJoined] = useState<string>(data.member.joinedAt ? new Date(data.member.joinedAt).toISOString().slice(0, 10) : '')
  const [notes, setNotes] = useState<string>(data.profile?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true); setError('')
    const r = await runAction(`/api/directivos/staff/${data.member.id}`, 'PATCH', { joinedAt: joined || null, notes: notes.trim() || null })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'No se pudo guardar.')
    onDone(); onClose()
  }
  return (
    <Sheet open title="Editar expediente" subtitle={data.member.username} onClose={onClose} busy={busy}
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={save} disabled={busy} className="btn-gold uppercase">Guardar</button></>}>
      <div className="space-y-4">
        <Field label="Fecha de ingreso al staff" htmlFor="pf-joined" hint="Solo para miembros que ingresaron antes de este sistema.">
          <input id="pf-joined" type="date" value={joined} onChange={e => setJoined(e.target.value)} className={`${inputCls} min-w-0`} />
        </Field>
        <Field label="Observaciones internas" htmlFor="pf-notes">
          <textarea id="pf-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} className={textareaCls} />
        </Field>
        <FormError message={error} />
      </div>
    </Sheet>
  )
}

function RankTab({ data }: { data: File }) {
  const m = data.member, a = data.access
  const rank = rankByKey(m.rank)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Rango efectivo" icon={Crown}>
        <InfoRow label="Rango interno"><RankBadge rank={m.rank} gmlevel={m.gmlevel} /></InfoRow>
        <InfoRow label="Origen del rango">{m.rankSource === 'rbac' ? 'RBAC (rbac_account_permissions)' : m.rankSource === 'expediente' ? 'Expediente del CMS' : 'Sin rango interno'}</InfoRow>
        <InfoRow label="Nivel GM esperado">{rank ? gmlevelLabel(rank.gmlevel) : '—'}</InfoRow>
        <InfoRow label="Nivel GM real">{gmlevelLabel(m.gmlevel)}</InfoRow>
        {m.gmlevelMismatch && <p className="mt-2 text-xs text-[#F6B40E]">⚠ El nivel GM real no coincide con el del rango. Puede haberse cambiado desde el juego; usá Ascender/Degradar para sincronizarlo.</p>}
        <p className="mt-3 text-xs text-slate-500">AzerothCore aplica los cambios cuando la cuenta vuelve a iniciar sesión.</p>
      </Card>
      <Card title="Permisos en AzerothCore" icon={ShieldAlert}>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1">account_access</h3>
        {a.accountAccess.length ? a.accountAccess.map((r: any) => <InfoRow key={r.RealmID} label={r.RealmID === -1 ? 'Todos los reinos (-1)' : `Reino ${r.RealmID}`}>gmlevel {r.gmlevel}</InfoRow>) : <p className="text-sm text-slate-500">Sin filas (jugador).</p>}
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mt-4 mb-1">RBAC</h3>
        {!a.rbacAvailable ? <p className="text-sm text-slate-500">Este servidor no tiene tablas RBAC (AzerothCore estándar).</p>
          : a.rbacRows.length ? a.rbacRows.map((r: any) => <InfoRow key={`${r.permission}-${r.realm}`} label={`${r.permission}${r.realm !== -1 ? ` · reino ${r.realm}` : ''}`}>{r.name ?? 'sin nombre'}{r.granted ? '' : ' (denegado)'}</InfoRow>)
            : <p className="text-sm text-slate-500">Sin permisos RBAC.</p>}
        {a.linked && rank && (
          <>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mt-4 mb-1">Permisos vinculados a {rank.name} ({rank.rbacId})</h3>
            {a.linked.length ? a.linked.map((l: any) => <InfoRow key={l.id} label={String(l.id)}>{l.name ?? '—'}</InfoRow>) : <p className="text-sm text-slate-500">rbac_linked_permissions no define permisos para este rango.</p>}
          </>
        )}
      </Card>
      <div className="lg:col-span-2">
        <Card title="Historial de rangos" icon={ArrowUpCircle}>
          {data.rankHistory.length === 0 ? <EmptyState title="Sin cambios de rango registrados" /> : (
            <ul className="divide-y divide-white/5">
              {data.rankHistory.map((h: any) => (
                <li key={h.id} className="py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-white font-medium capitalize">{h.operation}</span>
                    <RankBadge rank={h.old_rank_key} gmlevel={h.old_gmlevel} compact /> <span className="text-slate-500">→</span> <RankBadge rank={h.new_rank_key} gmlevel={h.new_gmlevel} compact />
                    <span className="text-xs text-slate-500">{fmtDate(h.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 break-words">Por {h.adminName} · gmlevel {h.old_gmlevel ?? '—'} → {h.new_gmlevel ?? '—'} · {h.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function DivisionTab({ data, can, onAssign, onDone }: { data: File; can: boolean; onAssign: () => void; onDone: () => void }) {
  const [modal, setModal] = useState<{ kind: 'role' | 'remove'; d: any } | null>(null)
  const [role, setRole] = useState<DivisionRole>('miembro')
  const active = (data.divisions as any[]).filter(d => d.active)
  return (
    <div className="space-y-4">
      <Card title="Divisiones actuales" icon={Network} actions={can && <button onClick={onAssign} className="btn-ghost px-2.5 py-1.5 text-xs">Asignar división</button>}>
        {active.length === 0 ? <EmptyState icon={Network} title="Sin división asignada" /> : (
          <ul className="divide-y divide-white/5">
            {active.map(d => (
              <li key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DivisionChip name={d.name} color={d.color} />
                  <span className="ml-2 text-sm text-white">{DIVISION_ROLE_LABEL[d.role as DivisionRole]}</span>
                  <p className="text-xs text-slate-500 mt-1 break-words">Desde {fmtDate(d.assigned_at, false)} · por {d.assignedByName} · {d.reason}</p>
                </div>
                {can && (
                  <div className="flex gap-2">
                    <button onClick={() => { setRole(d.role); setModal({ kind: 'role', d }) }} className="btn-ghost px-2.5 py-1.5 text-xs">Cambiar cargo</button>
                    <button onClick={() => setModal({ kind: 'remove', d })} className="btn-ghost px-2.5 py-1.5 text-xs text-red-300">Quitar</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Historial de asignaciones">
        {data.divisions.length === 0 ? <p className="text-sm text-slate-500">Sin registros.</p> : (
          <ul className="divide-y divide-white/5 text-sm">
            {(data.divisions as any[]).map(d => (
              <li key={d.id} className="py-2">
                <span className="text-white">{d.name}</span> <span className="text-slate-400">· {DIVISION_ROLE_LABEL[d.role as DivisionRole]}</span>
                <p className="text-xs text-slate-500 break-words">Asignado {fmtDate(d.assigned_at)} por {d.assignedByName}{d.active ? ' · vigente' : ` · retirado ${fmtDate(d.removed_at)} por ${d.removedByName ?? '—'} (${d.removed_reason ?? ''})`}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {modal && (
        <ReasonModal open title={modal.kind === 'role' ? 'Cambiar cargo' : 'Quitar de la división'} subtitle={`${data.member.username} · ${modal.d.name}`}
          confirmLabel={modal.kind === 'role' ? 'Guardar cargo' : 'Quitar'} danger={modal.kind === 'remove'} onClose={() => setModal(null)}
          onSubmit={async reason => {
            const body = modal.kind === 'role' ? { action: 'role', role, reason } : { action: 'remove', reason }
            const r = await runAction(`/api/directivos/divisiones/${modal.d.division_id}/miembros/${data.member.id}`, 'PATCH', body)
            if (!r.ok) return r.data.error ?? 'No se pudo actualizar.'
            onDone(); return null
          }}>
          {modal.kind === 'role' && (
            <Field label="Nuevo cargo" htmlFor="dv-role">
              <select id="dv-role" value={role} onChange={e => setRole(e.target.value as DivisionRole)} className={selectCls}>
                {DIVISION_ROLES.map(r => <option key={r} value={r}>{DIVISION_ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
          )}
        </ReasonModal>
      )}
    </div>
  )
}

function fmtDuration(s: number | null) {
  if (s == null) return 'Sin datos'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`
  if (s < 86400) return `${(s / 3600).toFixed(1)} h`
  return `${(s / 86400).toFixed(1)} días`
}

function PerformanceTab({ id }: { id: number }) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const { data, error } = useSWR(`/api/directivos/staff/rendimiento?member=${id}&period=${period}`, fetcher)
  const r = data?.rows?.[0]
  return (
    <Card title="Rendimiento" icon={Activity} actions={
      <select value={period} onChange={e => setPeriod(e.target.value as 'day' | 'week' | 'month')} className={`${selectCls} w-auto py-1.5 text-xs`} aria-label="Período">
        <option value="day">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option>
      </select>}>
      <ErrorBox error={error} />
      {!data ? <Skeletons rows={2} /> : !r ? <p className="text-sm text-slate-500">El miembro no está activo en el staff.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Tickets aceptados', r.ticketsAccepted], ['Tickets resueltos', r.ticketsResolved], ['Tickets pendientes', r.ticketsPending],
            ['1.ª respuesta (prom.)', fmtDuration(r.firstResponseSeconds)], ['Sanciones aplicadas', r.sanctions], ['Acciones registradas', r.actions],
            ['Advertencias vigentes', r.warnings], ['Antigüedad', r.joinedAt ? fmtAgo(r.joinedAt).replace('hace ', '') : 'Sin registro'],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
              <div className="text-lg font-bold text-white">{v}</div>
              <div className="text-[11px] text-slate-400">{l}</div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500 mt-3">Las métricas son apoyo a la supervisión y deben leerse con contexto (complejidad de los tickets, horarios, división). No generan sanciones automáticas.</p>
    </Card>
  )
}

function WarningsTab({ data, can, onIssue, onDone }: { data: File; can: boolean; onIssue: () => void; onDone: () => void }) {
  const [modal, setModal] = useState<{ w: any; status: WarningStatus } | null>(null)
  const ws = data.warnings as any[]
  const isStaff = data.member.status !== 'sin_permisos' && data.member.status !== 'retirado'
  return (
    <Card title="Advertencias" icon={AlertTriangle} actions={can && isStaff && <button onClick={onIssue} className="btn-ghost px-2.5 py-1.5 text-xs">Emitir advertencia</button>}>
      {ws.length === 0 ? <EmptyState icon={AlertTriangle} title="Sin advertencias registradas" /> : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                <th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Motivo</th><th className="py-2 pr-3">Directivo</th><th className="py-2 pr-3">Estado</th><th />
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {ws.map(w => (
                  <tr key={w.id} className="align-top">
                    <td className="py-2.5 pr-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(w.issued_at)}</td>
                    <td className="py-2.5 pr-3"><Pill color={WARNING_TYPE_COLOR[w.type as WarningType]}>{WARNING_TYPE_SHORT[w.type as WarningType]}</Pill></td>
                    <td className="py-2.5 pr-3 text-slate-200 max-w-[280px] break-words">{w.reason}{w.description && <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>}{w.status_note && <p className="text-xs text-slate-500 mt-0.5">Nota: {w.status_note} ({w.statusChangedByName})</p>}</td>
                    <td className="py-2.5 pr-3 text-slate-300">{w.issuedByName}</td>
                    <td className="py-2.5 pr-3"><Pill color={WARNING_STATUS_COLOR[w.status as WarningStatus]}>{WARNING_STATUS_LABEL[w.status as WarningStatus]}</Pill></td>
                    <td className="py-2.5 text-right">{can && <WarningActions w={w} onPick={status => setModal({ w, status })} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden divide-y divide-white/5">
            {ws.map(w => (
              <li key={w.id} className="py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill color={WARNING_TYPE_COLOR[w.type as WarningType]}>{WARNING_TYPE_SHORT[w.type as WarningType]}</Pill>
                  <Pill color={WARNING_STATUS_COLOR[w.status as WarningStatus]}>{WARNING_STATUS_LABEL[w.status as WarningStatus]}</Pill>
                  <span className="text-xs text-slate-500">{fmtDate(w.issued_at)}</span>
                </div>
                <p className="text-sm text-slate-200 mt-1 break-words">{w.reason}</p>
                <p className="text-xs text-slate-500">Por {w.issuedByName}{w.status_note ? ` · Nota: ${w.status_note}` : ''}</p>
                {can && <div className="mt-2"><WarningActions w={w} onPick={status => setModal({ w, status })} /></div>}
              </li>
            ))}
          </ul>
        </>
      )}
      {modal && (
        <ReasonModal open title={`Marcar como ${WARNING_STATUS_LABEL[modal.status].toLowerCase()}`} subtitle={WARNING_TYPE_LABEL[modal.w.type as WarningType]}
          text={modal.status === 'anulada' ? 'La advertencia deja de contar como vigente. El registro original se conserva.' : undefined}
          label={modal.status === 'revisada' || modal.status === 'vigente' ? 'Nota (mínimo 5 caracteres)' : 'Motivo'}
          confirmLabel="Guardar" danger={modal.status === 'anulada'} onClose={() => setModal(null)}
          onSubmit={async note => {
            const r = await runAction(`/api/directivos/staff/advertencias/${modal.w.id}`, 'PATCH', { status: modal.status, note })
            if (!r.ok) return r.data.error ?? 'No se pudo actualizar.'
            onDone(); return null
          }} />
      )}
    </Card>
  )
}

function WarningActions({ w, onPick }: { w: any; onPick: (s: WarningStatus) => void }) {
  if (w.status === 'anulada') return null
  const opts: WarningStatus[] = (['vigente', 'revisada', 'apelada', 'anulada'] as WarningStatus[]).filter(s => s !== w.status)
  return (
    <select value="" onChange={e => e.target.value && onPick(e.target.value as WarningStatus)} className={`${selectCls} w-auto py-1.5 text-xs`} aria-label="Cambiar estado">
      <option value="">Cambiar estado…</option>
      {opts.map(s => <option key={s} value={s}>{s === 'vigente' ? 'Volver a vigente' : `Marcar ${WARNING_STATUS_LABEL[s].toLowerCase()}`}</option>)}
    </select>
  )
}

function HistoryTab({ data }: { data: File }) {
  return (
    <div className="space-y-4">
      <Card title="Suspensiones" icon={PauseCircle}>
        {data.suspensions.length === 0 ? <p className="text-sm text-slate-500">Sin suspensiones.</p> : (
          <ul className="divide-y divide-white/5 text-sm">
            {(data.suspensions as any[]).map(s => (
              <li key={s.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-white">{SUSPENSION_SCOPE_LABEL[s.scope as 'interna' | 'juego']}</span>
                  <Pill color={s.state === 'vigente' ? '#f87171' : '#94a3b8'}>{SUSPENSION_STATE_LABEL[s.state as SuspensionState]}</Pill>
                  {s.restored_at && <Pill color="#4ade80">Permisos restaurados</Pill>}
                </div>
                <p className="text-xs text-slate-500 break-words">{fmtDate(s.starts_at)} → {fmtDate(s.ends_at)} · por {s.createdByName} · {s.reason}
                  {s.lifted_at ? ` · levantada por ${s.liftedByName} (${s.lift_reason})` : ''}{s.restored_at ? ` · restaurada por ${s.restoredByName}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Historial administrativo" icon={FileText}>
        {data.activity.length === 0 && data.legacyLogs.length === 0 ? <EmptyState title="Sin movimientos registrados" /> : (
          <ul className="divide-y divide-white/5 text-sm">
            {(data.activity as any[]).map(a => (
              <li key={`a${a.id}`} className="py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-white font-medium">{activityLabel(a.action)}</span>
                  <Pill color={RESULT_COLOR[a.result] ?? '#94a3b8'}>{a.result}</Pill>
                  <span className="text-xs text-slate-500">{fmtDate(a.created_at)}</span>
                </div>
                <p className="text-xs text-slate-400 break-words">Por {a.actor_name}{a.reason ? ` · ${a.reason}` : ''}{a.details ? ` · ${a.details}` : ''}</p>
              </li>
            ))}
            {(data.legacyLogs as any[]).filter(l => !String(l.action).startsWith('STAFF_')).map(l => (
              <li key={`l${l.id}`} className="py-2.5">
                <div className="flex flex-wrap items-center gap-1.5"><span className="text-slate-200">{l.action}</span><span className="text-xs text-slate-500">{fmtDate(l.created_at)} · registro de Directivos</span></div>
                <p className="text-xs text-slate-400 break-words">{l.details}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ActivityTab({ data }: { data: File }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Últimas acciones GM" icon={Activity}>
        {data.recentActions.length === 0 ? <p className="text-sm text-slate-500">Sin acciones GM registradas.</p> : (
          <ul className="divide-y divide-white/5 text-sm">
            {(data.recentActions as any[]).map(a => (
              <li key={a.id} className="py-2">
                <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs text-[#F6B40E]">{a.action}</span>{a.result && <Pill color={RESULT_COLOR[a.result] ?? '#94a3b8'}>{a.result}</Pill>}<span className="text-xs text-slate-500">{fmtDate(a.created_at)}</span></div>
                <p className="text-xs text-slate-400 break-words">{a.target_account_id ? <Link href={`/gm/cuentas/${a.target_account_id}`} className="text-[#74ACDF] hover:underline">cuenta #{a.target_account_id}</Link> : null}{a.target_character ? ` · ${a.target_character}` : ''}{a.reason ? ` · ${a.reason}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Tickets atendidos" icon={Ticket}>
        {data.recentTickets.length === 0 ? <p className="text-sm text-slate-500">Sin tickets asignados.</p> : (
          <ul className="divide-y divide-white/5 text-sm">
            {(data.recentTickets as any[]).map(t => (
              <li key={t.id} className="py-2 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/gm/soporte/${t.id}`} className="text-slate-100 hover:underline break-words"><span className="font-mono text-[#F6B40E]">#{t.id}</span> {t.subject}</Link>
                  <p className="text-xs text-slate-500">{t.closed_at ? `Cerrado ${fmtDate(t.closed_at)}` : `Aceptado ${fmtDate(t.assigned_at)}`}</p>
                </div>
                <TicketStatus status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
