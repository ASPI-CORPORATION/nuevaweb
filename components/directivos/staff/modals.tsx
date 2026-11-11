'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Loader2, ArrowUpCircle, ArrowDownCircle, UserMinus, AlertTriangle, PauseCircle, Network, FileText,
  UserPlus, ChevronRight, Search,
} from 'lucide-react'
import { fetcher, inputCls } from '@/components/gm/ui'
import { Sheet, Field, FormError, runAction, selectCls, textareaCls, RankBadge, InfoRow } from '@/components/directivos/staff/kit'
import {
  STAFF_RANKS, rankByKey, gmlevelLabel, DIVISION_ROLES, DIVISION_ROLE_LABEL, WARNING_TYPES, WARNING_TYPE_LABEL,
  WARNING_TYPE_COLOR, SUSPENSION_SCOPE_LABEL, type MemberStatus, type RankKey, type DivisionRole, type WarningType, type SuspensionScope,
} from '@/lib/staff/ranks'

export interface MemberLite {
  id: number
  username: string
  rank: RankKey | null
  gmlevel: number
  online?: boolean
  status: MemberStatus
  directivo?: 'propietario' | 'directivo' | null
  divisions?: Array<{ id: number; name: string; color: string; role: DivisionRole }>
  suspension?: { id: number; scope: SuspensionScope } | null
  pendingRestore?: { suspensionId: number } | null
  can?: { canManage: boolean; reason: string | null; isOwner: boolean }
}

export type StaffActionKey = 'ascender' | 'degradar' | 'asignar' | 'advertir' | 'suspender' | 'division' | 'retirar' | 'expediente'

const btnPrimary = 'btn-gold w-full sm:w-auto uppercase tracking-wider disabled:opacity-50'
const btnDanger = 'w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 inline-flex items-center justify-center gap-2'

function Busy({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <>{busy && <Loader2 className="w-4 h-4 animate-spin" />}{children}</>
}

function KickOption({ online, checked, onChange }: { online?: boolean; checked: boolean; onChange: (v: boolean) => void }) {
  if (!online) return null
  return (
    <label className="mt-3 flex items-start gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 accent-[#F6B40E]" />
      <span>Está conectado: desconectarlo del juego para que el cambio se aplique ya <span className="text-slate-500">(comando .kick)</span></span>
    </label>
  )
}

function ConfirmName({ username, value, onChange }: { username: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={`Escribí ${username} para confirmar`} htmlFor="confirm-name">
      <input id="confirm-name" value={value} onChange={e => onChange(e.target.value)} autoComplete="off" className={`${inputCls} font-mono`} placeholder={username} />
    </Field>
  )
}

// ── Rank change (asignar / ascender / degradar / incorporar) ────────────────

type RankMode = 'incorporar' | 'asignar' | 'ascender' | 'degradar'
const MODE_TITLE: Record<RankMode, string> = {
  incorporar: 'Incorporar al staff', asignar: 'Asignar rango', ascender: 'Ascender GM', degradar: 'Degradar GM',
}

export function RankModal({ open, mode, member, viewer, divisions, onClose, onDone }: {
  open: boolean; mode: RankMode; member: MemberLite; viewer: { username: string; isOwner: boolean }
  divisions?: Array<{ id: number; name: string; active: boolean }>; onClose: () => void; onDone: () => void
}) {
  const current = rankByKey(member.rank)
  const options = STAFF_RANKS.filter(r => (viewer.isOwner || !r.ownerOnly) && (
    mode === 'ascender' ? r.order > (current?.order ?? 0)
      : mode === 'degradar' ? r.order < (current?.order ?? 0)
        : true))
  const [rank, setRank] = useState<RankKey | ''>('')
  const [reason, setReason] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [divisionRole, setDivisionRole] = useState<DivisionRole>('en_formacion')
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [confirm, setConfirm] = useState('')
  const [kick, setKick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const target = rankByKey(rank)
  const elevated = !!(target?.elevated || current?.elevated)

  const next = () => {
    if (!target) return setError('Elegí el nuevo rango.')
    if (reason.trim().length < 5) return setError('El motivo es obligatorio (mínimo 5 caracteres).')
    setError(''); setStep('confirm')
  }
  const submit = async () => {
    if (elevated && confirm.trim().toUpperCase() !== member.username.toUpperCase()) return setError(`Escribí ${member.username} para confirmar.`)
    setBusy(true); setError('')
    const r = await runAction(`/api/directivos/staff/${member.id}/rango`, 'POST', {
      mode, rank, reason: reason.trim(), confirm: elevated ? confirm : undefined, kick,
      divisionId: mode === 'incorporar' && divisionId ? Number(divisionId) : undefined,
      divisionRole: mode === 'incorporar' && divisionId ? divisionRole : undefined,
    })
    setBusy(false)
    if (!r.ok) { setError(r.data.error ?? 'No se pudo completar la acción.'); if (r.status !== 428) setStep('form'); return }
    onDone(); onClose()
  }

  const isDemote = mode === 'degradar'
  return (
    <Sheet open={open} onClose={onClose} busy={busy} tone={isDemote ? 'danger' : 'gold'}
      title={step === 'confirm' ? (isDemote ? '⚠️ Confirmar degradación' : `Confirmar: ${MODE_TITLE[mode]}`) : MODE_TITLE[mode]}
      subtitle={`${member.username} · ID ${member.id}`}
      footer={step === 'form' ? (
        <>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={next} className={btnPrimary}>Continuar</button>
        </>
      ) : (
        <>
          <button onClick={() => { setStep('form'); setError('') }} disabled={busy} className="btn-ghost">Volver</button>
          <button onClick={submit} disabled={busy} className={isDemote ? btnDanger : btnPrimary}>
            <Busy busy={busy}>{isDemote ? 'Confirmar degradación' : mode === 'ascender' ? 'Confirmar ascenso' : mode === 'incorporar' ? 'Incorporar' : 'Confirmar'}</Busy>
          </button>
        </>
      )}>
      {step === 'form' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3">
            <InfoRow label="Cuenta seleccionada">{member.username} <span className="text-slate-500">#{member.id}</span></InfoRow>
            <InfoRow label="Rango actual"><RankBadge rank={member.rank} gmlevel={member.gmlevel} /></InfoRow>
            <InfoRow label="Directivo responsable">{viewer.username}</InfoRow>
          </div>
          {options.length === 0 ? (
            <p className="text-sm text-slate-400">No hay rangos disponibles para esta acción con tu nivel de autorización.</p>
          ) : (
            <Field label="Nuevo rango" htmlFor="rank-new" hint={target ? `En el juego: ${gmlevelLabel(member.gmlevel)} → ${gmlevelLabel(target.gmlevel)}` : undefined}>
              <select id="rank-new" value={rank} onChange={e => setRank(e.target.value as RankKey)} className={selectCls}>
                <option value="">Elegí un rango…</option>
                {options.map(r => <option key={r.key} value={r.key}>{r.order}. {r.name} — nivel GM {r.gmlevel}{r.ownerOnly ? ' (solo Propietario)' : ''}</option>)}
              </select>
            </Field>
          )}
          {mode === 'incorporar' && divisions && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="División inicial (opcional)" htmlFor="rank-div">
                <select id="rank-div" value={divisionId} onChange={e => setDivisionId(e.target.value)} className={selectCls}>
                  <option value="">Sin división</option>
                  {divisions.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              {divisionId && (
                <Field label="Cargo en la división" htmlFor="rank-divrole">
                  <select id="rank-divrole" value={divisionRole} onChange={e => setDivisionRole(e.target.value as DivisionRole)} className={selectCls}>
                    {DIVISION_ROLES.map(r => <option key={r} value={r}>{DIVISION_ROLE_LABEL[r]}</option>)}
                  </select>
                </Field>
              )}
            </div>
          )}
          <Field label={mode === 'degradar' ? 'Motivo (obligatorio)' : mode === 'incorporar' ? 'Motivo de incorporación' : 'Motivo'} htmlFor="rank-reason">
            <textarea id="rank-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} className={textareaCls}
              placeholder={mode === 'degradar' ? 'Incumplimiento reiterado del protocolo de soporte.' : 'Excelente desempeño en soporte y atención a jugadores.'} />
          </Field>
          <FormError message={error} />
        </div>
      ) : (
        <div className="space-y-3">
          {isDemote && <p className="text-sm text-slate-200">¿Estás seguro de que querés degradar a <b>{member.username}</b>? Esta acción modificará sus permisos administrativos.</p>}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3">
            <InfoRow label="Usuario">{member.username}</InfoRow>
            <InfoRow label="Rango actual"><RankBadge rank={member.rank} gmlevel={member.gmlevel} /></InfoRow>
            <InfoRow label="Nuevo rango"><RankBadge rank={rank || null} /></InfoRow>
            <InfoRow label="Nivel GM en el juego">{gmlevelLabel(member.gmlevel)} → {gmlevelLabel(target?.gmlevel)}</InfoRow>
            <InfoRow label="Motivo">{reason}</InfoRow>
            <InfoRow label="Directivo responsable">{viewer.username}</InfoRow>
          </div>
          {elevated && (
            <>
              <p className="text-xs text-[#F6B40E]">Rango elevado ({(current?.elevated ? current : target)?.name}): requiere confirmación explícita y queda auditado.</p>
              <ConfirmName username={member.username} value={confirm} onChange={setConfirm} />
            </>
          )}
          <KickOption online={member.online} checked={kick} onChange={setKick} />
          <p className="text-xs text-slate-500">AzerothCore aplica el nuevo nivel cuando la cuenta vuelve a iniciar sesión en el juego.</p>
          <FormError message={error} />
        </div>
      )}
    </Sheet>
  )
}

// ── Incorporar (desde un ID) ────────────────────────────────────────────────

interface AccountHit { id: number; username: string; online: boolean; gmlevel: number | null; staff: { rank: RankKey | null; status: MemberStatus } | null; directivo: string | null }

export function IncorporateModal({ open, initialId, viewer, onClose, onDone }: {
  open: boolean; initialId?: number; viewer: { username: string; isOwner: boolean }; onClose: () => void; onDone: () => void
}) {
  const [idText, setIdText] = useState(initialId ? String(initialId) : '')
  const [hit, setHit] = useState<AccountHit | null>(null)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')
  const { data: divs } = useSWR(open ? '/api/directivos/divisiones' : null, fetcher)

  const classify = (a: AccountHit | undefined): { hit?: AccountHit; error?: string } => {
    if (!a) return { error: 'No existe una cuenta con ese ID en acore_auth.account.' }
    if (a.staff && a.staff.status !== 'retirado') return { error: `${a.username} ya pertenece al staff. Gestionalo desde Staff y Rangos.` }
    if ((a.gmlevel ?? 0) > 0) return { error: `${a.username} ya tiene nivel GM ${a.gmlevel} en el juego. Gestionalo desde Staff y Rangos.` }
    return { hit: a }
  }
  // Opened from an account row: resolve that ID without an effect.
  const { data: pre, error: preError } = useSWR(open && initialId ? `/api/directivos/cuentas?q=${initialId}&pageSize=5` : null, fetcher)
  const preResult = pre ? classify((pre.accounts as AccountHit[]).find(x => x.id === initialId)) : null

  const lookup = async (raw = idText) => {
    const id = Number(raw)
    if (!Number.isInteger(id) || id <= 0) return setError('Ingresá un ID de cuenta válido.')
    setLooking(true); setError(''); setHit(null)
    try {
      const d = await fetcher(`/api/directivos/cuentas?q=${id}&pageSize=5`)
      const r = classify((d.accounts as AccountHit[]).find(x => x.id === id))
      if (r.hit) setHit(r.hit); else setError(r.error ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar la cuenta.')
    }
    setLooking(false)
  }
  const resolved = hit ?? (idText === String(initialId ?? '') ? preResult?.hit ?? null : null)
  const shownError = error || (idText === String(initialId ?? '') && !hit ? preResult?.error ?? (preError instanceof Error ? preError.message : '') : '')

  if (resolved) {
    return (
      <RankModal open={open} mode="incorporar" viewer={viewer} divisions={divs?.divisions}
        member={{ id: resolved.id, username: resolved.username, rank: null, gmlevel: 0, online: resolved.online, status: 'sin_permisos' }}
        onClose={() => { setHit(null); onClose() }} onDone={onDone} />
    )
  }
  return (
    <Sheet open={open} onClose={onClose} title="Incorporar al staff" subtitle="Buscá la cuenta de AzerothCore por su ID"
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
        <button onClick={() => lookup()} disabled={looking} className={btnPrimary}><Busy busy={looking}>Buscar cuenta</Busy></button>
      </>}>
      <Field label="ID de cuenta" htmlFor="inc-id" hint="La cuenta debe existir en acore_auth.account y no tener permisos GM.">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input id="inc-id" value={idText} onChange={e => setIdText(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && lookup()}
            inputMode="numeric" className={`${inputCls} pl-9 font-mono`} placeholder="Ej: 125" />
        </div>
      </Field>
      <FormError message={shownError} />
    </Sheet>
  )
}

// ── Retirar ─────────────────────────────────────────────────────────────────

export function RetireModal({ open, member, onClose, onDone }: { open: boolean; member: MemberLite; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState('')
  const [kick, setKick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (reason.trim().length < 5) return setError('El motivo de la destitución es obligatorio (mínimo 5 caracteres).')
    if (confirm.trim().toUpperCase() !== member.username.toUpperCase()) return setError(`Escribí ${member.username} para confirmar.`)
    setBusy(true); setError('')
    const r = await runAction(`/api/directivos/staff/${member.id}/retirar`, 'POST', { reason: reason.trim(), notes: notes.trim() || undefined, confirm, kick })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'No se pudo retirar al miembro.')
    onDone(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} busy={busy} tone="danger" title="Retirar del staff" subtitle={`${member.username} · ID ${member.id}`}
      footer={<>
        <button onClick={onClose} disabled={busy} className="btn-ghost">Cancelar</button>
        <button onClick={submit} disabled={busy} className={btnDanger}><Busy busy={busy}>Retirar del staff</Busy></button>
      </>}>
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-slate-300">
          Se revocan sus permisos GM{member.rank ? ` (${rankByKey(member.rank)!.name})` : ''} y sale de sus divisiones.
          <b className="text-white"> La cuenta y sus personajes se conservan</b>, y el expediente queda en el historial.
        </div>
        <InfoRow label="Cuenta">{member.username} <span className="text-slate-500">#{member.id}</span></InfoRow>
        <Field label="Motivo de la destitución" htmlFor="ret-reason">
          <textarea id="ret-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} className={textareaCls} />
        </Field>
        <Field label="Observaciones internas (opcional)" htmlFor="ret-notes">
          <textarea id="ret-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} className={textareaCls} />
        </Field>
        <ConfirmName username={member.username} value={confirm} onChange={setConfirm} />
        <KickOption online={member.online} checked={kick} onChange={setKick} />
        <FormError message={error} />
      </div>
    </Sheet>
  )
}

// ── Advertencia ─────────────────────────────────────────────────────────────

export function WarningModal({ open, member, viewer, onClose, onDone }: { open: boolean; member: MemberLite; viewer: { username: string }; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<WarningType>('escrita')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const today = useMemo(() => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }), [])
  const submit = async () => {
    if (reason.trim().length < 5) return setError('El motivo es obligatorio (mínimo 5 caracteres).')
    setBusy(true); setError('')
    const r = await runAction(`/api/directivos/staff/${member.id}/advertencias`, 'POST', { type, reason: reason.trim(), description: description.trim() || undefined })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'No se pudo registrar la advertencia.')
    onDone(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} busy={busy} title="Emitir advertencia" subtitle="Queda en el historial; no suspende automáticamente."
      footer={<>
        <button onClick={onClose} disabled={busy} className="btn-ghost">Cancelar</button>
        <button onClick={submit} disabled={busy} className={btnPrimary}><Busy busy={busy}>Registrar advertencia</Busy></button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID de cuenta"><input value={member.id} readOnly className={`${inputCls} font-mono opacity-80`} aria-label="ID de cuenta" /></Field>
          <Field label="Nombre del GM"><input value={member.username} readOnly className={`${inputCls} opacity-80`} aria-label="Nombre del GM" /></Field>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-slate-300">Tipo de advertencia</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {WARNING_TYPES.map(t => (
              <label key={t} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm cursor-pointer ${type === t ? 'bg-white/[0.04]' : 'border-white/10'}`}
                style={type === t ? { borderColor: WARNING_TYPE_COLOR[t] } : undefined}>
                <input type="radio" name="warn-type" value={t} checked={type === t} onChange={() => setType(t)} className="accent-[#F6B40E]" />
                <span style={{ color: type === t ? WARNING_TYPE_COLOR[t] : undefined }}>{WARNING_TYPE_LABEL[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Motivo" htmlFor="warn-reason">
          <input id="warn-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={200} className={inputCls} placeholder="Demoras reiteradas en la atención de tickets" />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="warn-desc">
          <textarea id="warn-desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} className={textareaCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Responsable">{viewer.username}</InfoRow>
          <InfoRow label="Fecha">{today}</InfoRow>
        </div>
        <FormError message={error} />
      </div>
    </Sheet>
  )
}

// ── Suspensión ──────────────────────────────────────────────────────────────

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export function SuspendModal({ open, member, onClose, onDone }: { open: boolean; member: MemberLite; onClose: () => void; onDone: () => void }) {
  const [scope, setScope] = useState<SuspensionScope>('interna')
  const [start, setStart] = useState(() => toLocalInput(new Date()))
  const [end, setEnd] = useState(() => toLocalInput(new Date(Date.now() + 3 * 86400000)))
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [kick, setKick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preset = (days: number) => {
    const base = scope === 'juego' ? new Date() : new Date(start)
    setEnd(toLocalInput(new Date(base.getTime() + days * 86400000)))
  }
  const submit = async () => {
    if (reason.trim().length < 5) return setError('El motivo es obligatorio (mínimo 5 caracteres).')
    const s = scope === 'juego' ? new Date() : new Date(start)
    const e = new Date(end)
    if (!(e > s)) return setError('La fecha de finalización debe ser posterior al inicio.')
    setBusy(true); setError('')
    const r = await runAction(`/api/directivos/staff/${member.id}/suspensiones`, 'POST', {
      scope, startsAt: scope === 'interna' ? s.toISOString() : undefined, endsAt: e.toISOString(), reason: reason.trim(), notes: notes.trim() || undefined, kick,
    })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'No se pudo aplicar la suspensión.')
    onDone(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} busy={busy} tone="danger" title="Suspender staff" subtitle={`${member.username} · ID ${member.id}`}
      footer={<>
        <button onClick={onClose} disabled={busy} className="btn-ghost">Cancelar</button>
        <button onClick={submit} disabled={busy} className={btnDanger}><Busy busy={busy}>Aplicar suspensión</Busy></button>
      </>}>
      <div className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-slate-300">Tipo de suspensión</legend>
          <div className="mt-1.5 grid gap-2">
            {(['interna', 'juego'] as const).map(s => (
              <label key={s} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-sm cursor-pointer ${scope === s ? 'border-[#F6B40E]/60 bg-[#F6B40E]/[0.05]' : 'border-white/10'}`}>
                <input type="radio" name="susp-scope" value={s} checked={scope === s} onChange={() => setScope(s)} className="mt-1 accent-[#F6B40E]" />
                <span>
                  <span className="text-white font-medium">{s === 'interna' ? '1. ' : '2. '}{SUSPENSION_SCOPE_LABEL[s]}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    {s === 'interna'
                      ? 'Bloquea las herramientas web del Panel GM. No cambia sus permisos dentro del juego.'
                      : 'Quita su nivel GM / RBAC en AzerothCore desde ahora. Al terminar NO se restaura solo: un Directivo lo confirma.'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha de inicio" htmlFor="susp-start" hint={scope === 'juego' ? 'La revocación en el juego empieza ahora.' : undefined}>
            <input id="susp-start" type="datetime-local" value={scope === 'juego' ? toLocalInput(new Date()) : start} disabled={scope === 'juego'}
              onChange={e => setStart(e.target.value)} className={`${inputCls} min-w-0 disabled:opacity-60`} />
          </Field>
          <Field label="Fecha de finalización" htmlFor="susp-end">
            <input id="susp-end" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className={`${inputCls} min-w-0`} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Duraciones rápidas">
          {[1, 3, 7, 14, 30].map(d => (
            <button key={d} type="button" onClick={() => preset(d)} className="px-2.5 py-1 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/5">{d === 1 ? '1 día' : `${d} días`}</button>
          ))}
        </div>
        <Field label="Motivo" htmlFor="susp-reason">
          <textarea id="susp-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} className={textareaCls} />
        </Field>
        <Field label="Observaciones (opcional)" htmlFor="susp-notes">
          <textarea id="susp-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} className={textareaCls} />
        </Field>
        {scope === 'juego' && <KickOption online={member.online} checked={kick} onChange={setKick} />}
        <FormError message={error} />
      </div>
    </Sheet>
  )
}

// ── Asignar división ────────────────────────────────────────────────────────

export function DivisionAssignForm({ fixedAccountId, fixedDivisionId, onDone, onCancel, compact }: {
  fixedAccountId?: number; fixedDivisionId?: number; onDone: () => void; onCancel?: () => void; compact?: boolean
}) {
  const { data: staff } = useSWR('/api/directivos/staff', fetcher)
  const { data: divs } = useSWR('/api/directivos/divisiones', fetcher)
  const [accountId, setAccountId] = useState(fixedAccountId ? String(fixedAccountId) : '')
  const [divisionId, setDivisionId] = useState(fixedDivisionId ? String(fixedDivisionId) : '')
  const [role, setRole] = useState<DivisionRole>('miembro')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const member = (staff?.members as MemberLite[] | undefined)?.find(m => m.id === Number(accountId))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number(accountId)) return setError('Ingresá el ID de cuenta.')
    if (staff && !member) return setError('Ese ID no corresponde a un miembro del staff.')
    if (!divisionId) return setError('Elegí la división.')
    if (reason.trim().length < 5) return setError('El motivo de asignación es obligatorio (mínimo 5 caracteres).')
    setBusy(true); setError('')
    const r = await runAction(`/api/directivos/divisiones/${divisionId}/miembros`, 'POST', { accountId: Number(accountId), role, reason: reason.trim() })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'No se pudo asignar la división.')
    setReason(''); if (!fixedAccountId) setAccountId('')
    onDone()
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        <Field label="ID de Cuenta:" htmlFor="div-acc">
          <input id="div-acc" value={accountId} onChange={e => setAccountId(e.target.value.replace(/\D/g, ''))} readOnly={!!fixedAccountId}
            inputMode="numeric" className={`${inputCls} font-mono`} placeholder="Ej: 12" />
        </Field>
        <Field label="Nombre del Staff:" htmlFor="div-name">
          <input id="div-name" value={member?.username ?? (accountId && staff ? 'No es miembro del staff' : '')} readOnly className={`${inputCls} opacity-80`} />
        </Field>
        <Field label="División:" htmlFor="div-div">
          <select id="div-div" value={divisionId} onChange={e => setDivisionId(e.target.value)} disabled={!!fixedDivisionId} className={selectCls}>
            <option value="">Elegí…</option>
            {(divs?.divisions ?? []).filter((d: { active: boolean }) => d.active).map((d: { id: number; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Cargo dentro de la división:" htmlFor="div-role">
          <select id="div-role" value={role} onChange={e => setRole(e.target.value as DivisionRole)} className={selectCls}>
            {DIVISION_ROLES.map(r => <option key={r} value={r}>{DIVISION_ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Motivo de asignación:" htmlFor="div-reason">
        <input id="div-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} className={inputCls} placeholder="Refuerzo del equipo de soporte nocturno" />
      </Field>
      <p className="text-xs text-slate-500">Las divisiones son administrativas: no otorgan permisos RBAC, acceso a Directivos ni comandos en el juego.</p>
      <FormError message={error} />
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button>}
        <button type="submit" disabled={busy} className={btnPrimary}><Busy busy={busy}>Asignar división</Busy></button>
      </div>
    </form>
  )
}

export function DivisionAssignModal({ open, member, onClose, onDone }: { open: boolean; member?: MemberLite; onClose: () => void; onDone: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Asignar división" subtitle={member ? `${member.username} · ID ${member.id}` : undefined} wide>
      <DivisionAssignForm fixedAccountId={member?.id} compact onDone={() => { onDone(); onClose() }} onCancel={onClose} />
    </Sheet>
  )
}

// ── Motivo genérico ─────────────────────────────────────────────────────────

export function ReasonModal({ open, title, subtitle, text, label = 'Motivo', confirmLabel, danger, minLength = 5, children, onClose, onSubmit }: {
  open: boolean; title: string; subtitle?: string; text?: React.ReactNode; label?: string; confirmLabel: string; danger?: boolean; minLength?: number
  children?: React.ReactNode; onClose: () => void; onSubmit: (reason: string) => Promise<string | null>
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (reason.trim().length < minLength) return setError(`Completá el motivo (mínimo ${minLength} caracteres).`)
    setBusy(true); setError('')
    const err = await onSubmit(reason.trim())
    setBusy(false)
    if (err) return setError(err)
    setReason(''); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} busy={busy} tone={danger ? 'danger' : 'gold'} title={title} subtitle={subtitle}
      footer={<>
        <button onClick={onClose} disabled={busy} className="btn-ghost">Cancelar</button>
        <button onClick={submit} disabled={busy} className={danger ? btnDanger : btnPrimary}><Busy busy={busy}>{confirmLabel}</Busy></button>
      </>}>
      <div className="space-y-3">
        {text && <div className="text-sm text-slate-300">{text}</div>}
        {children}
        <Field label={label} htmlFor="reason-modal">
          <textarea id="reason-modal" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} className={textareaCls} />
        </Field>
        <FormError message={error} />
      </div>
    </Sheet>
  )
}

// ── Panel "Administrar" ─────────────────────────────────────────────────────

export function StaffActionsSheet({ open, member, onClose, onPick }: { open: boolean; member: MemberLite | null; onClose: () => void; onPick: (k: StaffActionKey) => void }) {
  if (!member) return null
  const can = member.can?.canManage ?? false
  const current = rankByKey(member.rank)
  const blockedRank = member.status === 'suspendido' || member.status === 'pendiente_restauracion'
  const items: Array<{ key: StaffActionKey; label: string; icon: typeof FileText; hint?: string; danger?: boolean; disabled?: boolean }> = [
    { key: 'expediente', label: 'Ver expediente', icon: FileText },
    ...(current ? [
      { key: 'ascender' as const, label: 'Ascender GM', icon: ArrowUpCircle, disabled: !can || blockedRank || current.order >= 10 },
      { key: 'degradar' as const, label: 'Degradar GM', icon: ArrowDownCircle, disabled: !can || blockedRank || current.order <= 1 },
    ] : [{ key: 'asignar' as const, label: 'Asignar rango', icon: UserPlus, hint: 'Tiene nivel GM pero ningún rango interno', disabled: !can || blockedRank }]),
    { key: 'division', label: 'Asignar división', icon: Network, disabled: !(can || (member.can?.isOwner && member.directivo)) },
    { key: 'advertir', label: 'Emitir advertencia', icon: AlertTriangle, disabled: !can },
    { key: 'suspender', label: 'Suspender staff', icon: PauseCircle, disabled: !can || member.status !== 'activo', danger: true },
    { key: 'retirar', label: 'Retirar del staff', icon: UserMinus, disabled: !can, danger: true },
  ]
  return (
    <Sheet open={open} onClose={onClose} title={`Administrar · ${member.username}`}
      subtitle={<span className="inline-flex flex-wrap items-center gap-1.5">ID {member.id} <RankBadge rank={member.rank} gmlevel={member.gmlevel} compact /></span>}>
      {!can && member.can?.reason && (
        <p className="mb-3 px-3 py-2 rounded-xl border border-[#F6B40E]/25 bg-[#F6B40E]/[0.06] text-xs text-[#F6B40E]">{member.can.reason}</p>
      )}
      <ul className="divide-y divide-white/5 -mx-1">
        {items.map(it => (
          <li key={it.key}>
            <button disabled={it.disabled} onClick={() => onPick(it.key)}
              className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl text-left disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.04] ${it.danger ? 'text-red-300' : 'text-slate-100'}`}>
              <it.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{it.label}</span>
                {it.hint && <span className="block text-xs text-slate-500">{it.hint}</span>}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** Wires the action keys to their modals (shared by the list and the expediente). */
export function StaffActionModals({ member, action, viewer, onClose, onDone }: {
  member: MemberLite | null; action: StaffActionKey | null; viewer: { username: string; isOwner: boolean }; onClose: () => void; onDone: () => void
}) {
  if (!member || !action) return null
  const common = { open: true, member, onClose, onDone }
  switch (action) {
    case 'ascender': case 'degradar': case 'asignar':
      return <RankModal key={`${action}-${member.id}`} {...common} mode={action} viewer={viewer} />
    case 'retirar': return <RetireModal key={`r-${member.id}`} {...common} />
    case 'advertir': return <WarningModal key={`w-${member.id}`} {...common} viewer={viewer} />
    case 'suspender': return <SuspendModal key={`s-${member.id}`} {...common} />
    case 'division': return <DivisionAssignModal key={`d-${member.id}`} {...common} />
    default: return null
  }
}
