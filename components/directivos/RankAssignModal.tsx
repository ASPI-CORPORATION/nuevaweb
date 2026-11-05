'use client'

import { useState } from 'react'
import { X, AlertTriangle, Crown, Shield, ChevronDown } from 'lucide-react'
import { CUSTOM_RBAC_RANKS, RBAC_RANK_IDS, HIGH_RISK_RANKS, getRank } from '@/lib/rbac'

export interface StaffMember {
  id: number; username: string; email: string; online: number
  gmlevel: number; rbac_rank_id: number | null
}

interface Props {
  member: StaffMember
  callerRankId: number | null    // passed from server via page props
  onClose: () => void
  onSuccess: () => void
}

export function RankAssignModal({ member, callerRankId, onClose, onSuccess }: Props) {
  const callerLevel = callerRankId === null ? 9 : (getRank(callerRankId)?.level ?? 9)

  // Build selectable rank list: only ranks strictly below caller's level
  const selectableRanks = RBAC_RANK_IDS.filter(id => CUSTOM_RBAC_RANKS[id].level < callerLevel)

  const [selectedRankId, setSelectedRankId] = useState<number | 'remove'>(
    member.rbac_rank_id ?? 'remove'
  )
  const [reason, setReason]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [cacheNote, setCacheNote] = useState('')

  const currentRank = member.rbac_rank_id !== null ? getRank(member.rbac_rank_id) : null
  const newRankId   = selectedRankId === 'remove' ? null : selectedRankId
  const newRank     = newRankId !== null ? getRank(newRankId) : null
  const isHighRisk  = newRankId !== null && HIGH_RISK_RANKS.has(newRankId)
  const unchanged   = member.rbac_rank_id === newRankId

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Escribí un motivo'); return }
    if (unchanged) { setError('El rango seleccionado es el mismo que el actual'); return }

    setSaving(true); setError(''); setCacheNote('')
    try {
      const res = await fetch('/api/directivos/staff/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: member.id, rankId: newRankId, reason }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error desconocido'); setSaving(false); return }
      setCacheNote(data.cacheNote ?? '')
      setTimeout(() => { onSuccess(); onClose() }, 1800)
    } catch {
      setError('Error de red')
      setSaving(false)
    }
  }

  // ── Styles (design palette) ───────────────────────────────────────────────
  const gold   = '#F6B40E'
  const celeste = '#74ACDF'
  const dark   = '#101F35'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: dark, border: `1px solid ${gold}30` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${gold}20`, background: `${gold}08` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${gold}15`, border: `1px solid ${gold}30` }}>
              <Crown className="w-4 h-4" style={{ color: gold }} />
            </div>
            <div>
              <div className="font-['Cinzel'] font-bold text-white text-sm">Asignar Rango RBAC</div>
              <div className="text-xs mt-0.5" style={{ color: `${gold}80` }}>
                {member.username} · ID {member.id}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Current state */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs mb-1.5" style={{ color: `${gold}60` }}>Rango RBAC actual</div>
              {currentRank ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-2.5 py-1"
                  style={{ background: currentRank.badgeBg, border: `1px solid ${currentRank.badgeBorder}`, color: currentRank.color }}>
                  <Shield className="w-3.5 h-3.5" /> {currentRank.name}
                </span>
              ) : (
                <span className="text-sm" style={{ color: '#4a5568' }}>Sin rango</span>
              )}
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs mb-1.5" style={{ color: `${gold}60` }}>Nivel GM estándar</div>
              <span className="text-sm font-mono font-semibold" style={{ color: celeste }}>
                {member.gmlevel === 0 ? 'Sin acceso' : `GM ${member.gmlevel}`}
              </span>
            </div>
          </div>

          {/* New rank selector */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: `${gold}90` }}>
              Nuevo rango RBAC *
            </label>
            <div className="relative">
              <select
                value={selectedRankId}
                onChange={e => setSelectedRankId(e.target.value === 'remove' ? 'remove' : parseInt(e.target.value))}
                className="w-full appearance-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${gold}25`,
                  color: newRank ? newRank.color : '#6b7280',
                }}>
                <option value="remove" style={{ background: '#101F35', color: '#6b7280' }}>
                  — Retirar rango
                </option>
                {selectableRanks.map(id => {
                  const r = CUSTOM_RBAC_RANKS[id]
                  return (
                    <option key={id} value={id} style={{ background: '#101F35', color: r.color }}>
                      {r.name}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: `${gold}60` }} />
            </div>

            {/* Visual rank cards */}
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {RBAC_RANK_IDS.map(id => {
                const r = CUSTOM_RBAC_RANKS[id]
                const selectable = r.level < callerLevel
                const active = selectedRankId === id
                return (
                  <button
                    key={id}
                    disabled={!selectable}
                    onClick={() => selectable && setSelectedRankId(id)}
                    title={r.name}
                    className="relative rounded-lg py-2 text-center transition-all"
                    style={{
                      background: active ? r.badgeBg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? r.badgeBorder : 'rgba(255,255,255,0.06)'}`,
                      opacity: selectable ? 1 : 0.3,
                      cursor: selectable ? 'pointer' : 'not-allowed',
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                    }}>
                    <div className="text-[10px] font-bold leading-tight" style={{ color: r.color }}>
                      {r.name.split(' ').map((w, i) => <div key={i}>{w}</div>)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* High-risk warning */}
          {isHighRisk && (
            <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
              style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Rango de alto nivel:</strong> Estás a punto de asignar{' '}
                <strong>{newRank?.name}</strong>. Este rango otorga permisos administrativos elevados en AzerothCore.
                Verificá que la cuenta pertenece a un staff de confianza antes de confirmar.
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: `${gold}90` }}>
              Motivo * <span className="font-normal" style={{ color: `${gold}50` }}>(queda en auditoría permanente)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Ascenso por buen desempeño / Retiro por inactividad..."
              rows={2}
              maxLength={300}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${gold}20` }}
            />
            <div className="text-right text-xs mt-1" style={{ color: `${gold}40` }}>{reason.length}/300</div>
          </div>

          {/* Cache note (after success) */}
          {cacheNote && (
            <div className="text-xs rounded-xl px-4 py-3"
              style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
              ✓ {cacheNote}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs rounded-xl px-4 py-2.5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || unchanged || !reason.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Cinzel'] transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${gold}, #B8860B)`, color: '#000' }}>
              {saving ? 'Guardando…' : (selectedRankId === 'remove' ? 'Retirar rango' : 'Asignar rango')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
