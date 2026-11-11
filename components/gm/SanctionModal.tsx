'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Gavel, Loader2, X, AlertTriangle, ShieldAlert } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { SANCTION_DURATIONS, can, type GmTier } from '@/lib/gm/permissions'
import { inputCls } from '@/components/gm/ui'

export type SanctionKind = 'ban_account' | 'ban_character' | 'mute'

const TITLES: Record<SanctionKind, string> = {
  ban_account: 'Banear cuenta',
  ban_character: 'Banear personaje',
  mute: 'Silenciar jugador',
}

interface Props {
  open: boolean
  kind: SanctionKind
  tier: GmTier
  gmName: string
  target: { label: string; accountId: number; characterGuid?: number; characters?: Array<{ guid: number; name: string; online: boolean }> }
  onClose: () => void
  onDone: () => void
}

export function SanctionModal({ open, kind, tier, gmName, target, onClose, onDone }: Props) {
  const [duration, setDuration] = useState('1h')
  const [reason, setReason] = useState('')
  const [charGuid, setCharGuid] = useState<number | undefined>(target.characterGuid)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const durations = SANCTION_DURATIONS.filter(d => {
    if (d.key !== 'perm') return true
    if (kind === 'mute') return false
    return can(tier, kind === 'ban_account' ? 'banAccountPerm' : 'banCharacterPerm')
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const validate = () => {
    if (reason.trim().length < 5) { setError('El motivo es obligatorio (mínimo 5 caracteres).'); return false }
    if (kind === 'mute' && !charGuid && !target.characters?.length) { setError('La cuenta no tiene personajes para aplicar el silencio.'); return false }
    setError('')
    return true
  }

  const submit = async () => {
    setBusy(true)
    try {
      const url = kind === 'ban_character'
        ? `/api/gm/characters/${target.characterGuid}`
        : `/api/gm/accounts/${target.accountId}/sanctions`
      const body = kind === 'ban_character'
        ? { action: 'ban', duration, reason: reason.trim() }
        : kind === 'ban_account'
          ? { action: 'ban', duration, reason: reason.trim() }
          : { action: 'mute', duration, reason: reason.trim(), characterGuid: charGuid ?? target.characters?.[0]?.guid }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setConfirming(false)
        setError(d.error || 'No se pudo aplicar la sanción.')
        notify.error(res.status === 403 ? 'Permisos insuficientes' : 'No se pudo aplicar la sanción', d.error)
        return
      }
      notify.success(kind === 'mute' ? 'Jugador silenciado' : 'Sanción aplicada', d.message)
      setReason('')
      setConfirming(false)
      onDone()
      onClose()
    } catch {
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
    } finally {
      setBusy(false)
    }
  }

  const durLabel = SANCTION_DURATIONS.find(d => d.key === duration)?.label

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={TITLES[kind]}>
          <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} />
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="relative w-full sm:max-w-lg max-h-[92svh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-red-500/25 bg-[#0A1628] shadow-2xl"
          >
            <div className="h-1 bg-gradient-to-r from-red-500 via-[#F6B40E] to-red-500" aria-hidden="true" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Gavel className="w-5 h-5 text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-['Cinzel'] font-bold text-lg text-white">{TITLES[kind]}</h2>
                  <p className="text-sm text-slate-400 truncate">{target.label}</p>
                </div>
                <button onClick={onClose} disabled={busy} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Cerrar"><X className="w-5 h-5" /></button>
              </div>

              {!confirming ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">Usuario</div>
                      <div className="text-white font-semibold truncate">{target.label}</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">GM responsable</div>
                      <div className="text-[#cfe6f8] font-semibold truncate">{gmName}</div>
                    </div>
                  </div>

                  {kind === 'mute' && target.characters && target.characters.length > 0 && (
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">Personaje (el silencio afecta a toda la cuenta)</span>
                      <select value={charGuid ?? target.characters[0].guid} onChange={e => setCharGuid(Number(e.target.value))} className={`${inputCls} mt-1.5`}>
                        {target.characters.map(c => <option key={c.guid} value={c.guid}>{c.name}{c.online ? ' (en línea)' : ''}</option>)}
                      </select>
                    </label>
                  )}

                  <div>
                    <span className="text-sm font-medium text-slate-300">Duración</span>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {durations.map(d => (
                        <button key={d.key} type="button" onClick={() => setDuration(d.key)} aria-pressed={duration === d.key}
                          className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${duration === d.key
                            ? d.key === 'perm' ? 'bg-red-600 border-red-500 text-white' : 'bg-[#74ACDF] border-[#74ACDF] text-[#050A14]'
                            : 'border-white/15 text-slate-300 hover:bg-white/5'}`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {kind !== 'mute' && !can(tier, kind === 'ban_account' ? 'banAccountPerm' : 'banCharacterPerm') && (
                      <p className="text-[11px] text-slate-500 mt-1.5">Las sanciones permanentes solo las aplica un GM nivel 3.</p>
                    )}
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Motivo <span className="text-red-400">*</span></span>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={250}
                      placeholder="Ej: Uso de programas externos detectado en arenas" className={`${inputCls} mt-1.5 resize-y`} />
                    <span className="block text-right text-[11px] text-slate-500">{reason.length}/250</span>
                  </label>

                  {error && <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">{error}</div>}

                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
                    <button onClick={onClose} className="btn-ghost">Cancelar</button>
                    <button onClick={() => validate() && setConfirming(true)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500">
                      <ShieldAlert className="w-4 h-4" /> Continuar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#F6B40E]/35 bg-[#F6B40E]/10 p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#F6B40E] shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-white">¿Estás seguro de que querés aplicar esta sanción?</p>
                      <p className="text-slate-300 mt-1">
                        {TITLES[kind]} · <strong className="text-white">{target.label}</strong> · {durLabel}
                      </p>
                      <p className="text-slate-400 mt-1 break-words">Motivo: {reason.trim()}</p>
                      <p className="text-slate-500 text-xs mt-2">Se ejecuta en el worldserver y queda registrada a tu nombre.</p>
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button onClick={() => setConfirming(false)} disabled={busy} className="btn-ghost">Volver</button>
                    <button onClick={submit} disabled={busy} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />} Confirmar sanción
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
