'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, LifeBuoy, MapPin, LogOut, Gavel, ShieldCheck, Lock } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { SanctionModal } from '@/components/gm/SanctionModal'
import { OnlineDot, Pill, inputCls } from '@/components/gm/ui'
import { can, type GmTier } from '@/lib/gm/permissions'
import { CAPITALS, CLASS_COLORS, defaultCapital, type Faction } from '@/lib/gm/wow-data'

export interface CharacterSummary {
  guid: number
  name: string
  level: number
  classId: number
  className: string
  raceName: string
  faction: Faction | null
  zone: string
  online: boolean
  guild?: string | null
  accountId: number
  accountName?: string | null
}

type Pending =
  | { kind: 'unstuck' }
  | { kind: 'teleport' }
  | { kind: 'kick' }
  | { kind: 'unban' }
  | null

export function CharacterTools({ character, tier, gmName, protectedReason, onClose, onChanged }: {
  character: CharacterSummary | null
  tier: GmTier
  gmName: string
  protectedReason?: string | null
  onClose: () => void
  onChanged?: () => void
}) {
  const [location, setLocation] = useState<'inn' | 'graveyard' | 'startzone'>('inn')
  // Mounted with key={guid} by its callers, so the defaults follow the selected character
  const [capital, setCapital] = useState(() => defaultCapital(character?.faction ?? null)?.key ?? CAPITALS[0].key)
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [banOpen, setBanOpen] = useState(false)

  useEffect(() => {
    if (!character) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending && !banOpen) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [character, pending, banOpen, onClose])

  if (!character) return null
  const capitalLabel = CAPITALS.find(c => c.key === capital)?.label ?? ''
  const locLabel = { inn: 'su posada (piedra de hogar)', graveyard: 'el cementerio más cercano', startzone: 'su zona de inicio' }[location]

  const run = async () => {
    if (!pending) return
    setBusy(true)
    const body = pending.kind === 'unstuck' ? { action: 'unstuck', location }
      : pending.kind === 'teleport' ? { action: 'teleport', capital }
      : pending.kind === 'kick' ? { action: 'kick' }
      : { action: 'unban' }
    try {
      const res = await fetch(`/api/gm/characters/${character.guid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error(res.status === 403 ? 'Permisos insuficientes' : 'No se pudo completar la operación', d.error)
      } else {
        const title = { unstuck: 'Personaje desatascado', teleport: 'Personaje teletransportado', kick: 'Jugador expulsado', unban: 'Sanción revocada' }[pending.kind]
        notify.success(title, d.message)
        onChanged?.()
      }
    } catch {
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const tool = (opts: { icon: typeof LifeBuoy; title: string; desc: string; children?: React.ReactNode; action: React.ReactNode; tone?: string }) => (
    <div className="rounded-xl border bg-white/[0.02] p-4" style={{ borderColor: `${opts.tone ?? '#74ACDF'}33` }}>
      <div className="flex items-start gap-3">
        <opts.icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: opts.tone ?? '#74ACDF' }} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-sm">{opts.title}</div>
          <div className="text-xs text-slate-400">{opts.desc}</div>
          {opts.children && <div className="mt-3">{opts.children}</div>}
          <div className="mt-3">{opts.action}</div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Administrar ${character.name}`}>
          <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            className="relative w-full sm:max-w-2xl max-h-[92svh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#74ACDF]/25 bg-[#0A1628] shadow-2xl">
            <div className="sticky top-0 z-10 bg-[#0A1628]/95 backdrop-blur border-b border-white/10 px-5 py-4 flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-['Cinzel'] font-black text-lg shrink-0"
                style={{ background: `${CLASS_COLORS[character.classId] ?? '#74ACDF'}22`, color: CLASS_COLORS[character.classId] ?? '#74ACDF' }}>
                {character.level}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-['Cinzel'] font-bold text-lg text-white truncate">{character.name}</h2>
                <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 gap-y-1 items-center">
                  <span style={{ color: CLASS_COLORS[character.classId] }}>{character.className}</span>
                  <span>· {character.raceName}</span>
                  {character.faction && <Pill color={character.faction === 'Alianza' ? '#74ACDF' : '#f87171'}>{character.faction}</Pill>}
                  <span>· GUID {character.guid}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  <OnlineDot online={character.online} />
                  <span><MapPin className="w-3 h-3 inline" /> {character.zone}</span>
                  {character.accountName && <span>Cuenta: <span className="text-slate-200">{character.accountName}</span> (#{character.accountId})</span>}
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-3">
              {protectedReason && (
                <div className="rounded-xl border border-[#F6B40E]/35 bg-[#F6B40E]/10 px-4 py-3 text-sm text-[#ffe08a] flex gap-2">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" /> {protectedReason}
                </div>
              )}

              {can(tier, 'unstuck') && tool({
                icon: LifeBuoy, title: 'Desatascar personaje',
                desc: `Usa .unstuck del core. Funciona ${character.online ? 'en línea' : 'aunque esté desconectado'}; no edita coordenadas por SQL.`,
                children: (
                  <select value={location} onChange={e => setLocation(e.target.value as typeof location)} className={inputCls} aria-label="Destino del unstuck">
                    <option value="inn">Posada / piedra de hogar</option>
                    <option value="graveyard">Cementerio más cercano</option>
                    <option value="startzone">Zona de inicio</option>
                  </select>
                ),
                action: <button onClick={() => setPending({ kind: 'unstuck' })} className="btn-primary w-full sm:w-auto uppercase tracking-wide text-xs">Desatascar personaje</button>,
              })}

              {can(tier, 'teleport') && tool({
                icon: MapPin, title: 'Enviar a capital', tone: '#F6B40E',
                desc: `Capital por defecto según la facción${character.faction ? ` (${character.faction})` : ''}. Ubicaciones tomadas de acore_world.game_tele.`,
                children: (
                  <select value={capital} onChange={e => setCapital(e.target.value)} className={inputCls} aria-label="Capital de destino">
                    {(['Alianza', 'Horda'] as const).map(f => (
                      <optgroup key={f} label={f}>
                        {CAPITALS.filter(c => c.faction === f).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                ),
                action: <button onClick={() => setPending({ kind: 'teleport' })} className="btn-gold w-full sm:w-auto uppercase tracking-wide text-xs">Enviar a capital</button>,
              })}

              {(can(tier, 'kick') || can(tier, 'banCharacterTemp')) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {can(tier, 'kick') && tool({
                    icon: LogOut, title: 'Expulsar (kick)', tone: '#fb923c',
                    desc: character.online ? 'Desconecta al jugador del servidor.' : 'Disponible solo si el personaje está en línea.',
                    action: <button disabled={!character.online} onClick={() => setPending({ kind: 'kick' })} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed">Kick</button>,
                  })}
                  {can(tier, 'banCharacterTemp') && tool({
                    icon: Gavel, title: 'Sanción de personaje', tone: '#f87171',
                    desc: 'Ban temporal (permanente solo GM 3) o revocar una sanción.',
                    action: (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setBanOpen(true)} className="w-full px-4 py-2 rounded-xl text-xs font-bold uppercase text-white bg-red-600 hover:bg-red-500">Banear personaje</button>
                        <button onClick={() => setPending({ kind: 'unban' })} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-white/15 text-slate-200 hover:bg-white/5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Desbanear personaje
                        </button>
                      </div>
                    ),
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <ConfirmDialog
        open={!!pending}
        warning={pending?.kind !== 'unban'}
        title={pending?.kind === 'unstuck' ? 'Desatascar personaje' : pending?.kind === 'teleport' ? 'Enviar a capital' : pending?.kind === 'kick' ? 'Expulsar jugador' : 'Revocar sanción'}
        message={
          pending?.kind === 'unstuck' ? `${character.name} será enviado a ${locLabel}.`
            : pending?.kind === 'teleport' ? `${character.name} será teletransportado a ${capitalLabel}.`
            : pending?.kind === 'kick' ? `${character.name} será desconectado del servidor.`
            : `Se levantará el baneo activo de ${character.name}.`
        }
        confirmLabel={busy ? 'Procesando…' : 'Confirmar'}
        busy={busy}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />

      <SanctionModal
        open={banOpen}
        kind="ban_character"
        tier={tier}
        gmName={gmName}
        target={{ label: character.name, accountId: character.accountId, characterGuid: character.guid }}
        onClose={() => setBanOpen(false)}
        onDone={() => onChanged?.()}
      />
    </>
  )
}
