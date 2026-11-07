'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Trophy, Shield, Zap, TrendingUp } from 'lucide-react'

export interface PvpPlayer {
  name: string; class: number; totalHonorPoints: number; arenaPoints: number; level: number; guild?: string | null
}

interface Props { honor: PvpPlayer[]; arena: PvpPlayer[]; level: PvpPlayer[] }

const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569',
  5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0',
  9: '#9482C9', 11: '#FF7D0A',
}
const CLASS_NAMES: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladín', 3: 'Cazador', 4: 'Pícaro',
  5: 'Sacerdote', 6: 'DK', 7: 'Chamán', 8: 'Mago', 9: 'Brujo', 11: 'Druida',
}

const RANK_STYLES = [
  { bg: 'rgba(246, 180, 14,0.12)', border: 'rgba(246, 180, 14,0.3)', text: '#F6B40E' },
  { bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.25)', text: '#C0C0C0' },
  { bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.25)', text: '#CD7F32' },
]

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-400 mx-auto" />
  const s = RANK_STYLES[rank]
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto font-['Cinzel'] font-black text-sm"
      style={s ? { background: s.bg, border: `1px solid ${s.border}`, color: s.text } : { color: '#4a5568' }}>
      {rank + 1}
    </div>
  )
}

function PlayerTable({ players, valueKey, label }: { players: PvpPlayer[]; valueKey: keyof PvpPlayer; label: string }) {
  if (players.length === 0) {
    return (
      <div className="text-center py-14">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.1)' }}>
          <Shield className="w-7 h-7" style={{ color: 'rgba(117,199,255,0.3)' }} />
        </div>
        <p className="font-['Cinzel'] font-bold text-white mb-1 text-sm">Todavía no hay guerreros</p>
        <p className="text-slate-500 text-xs">Sé el primero en escribir tu nombre en la historia de Rasganorte.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {players.map((p, i) => (
        <Link key={p.name} href={`/armory/${encodeURIComponent(p.name)}`}>
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 hover:translate-x-1 group cursor-pointer"
            style={{
              background: i < 3 ? RANK_STYLES[i].bg : 'rgba(255,255,255,0.02)',
              border: `1px solid ${i < 3 ? RANK_STYLES[i].border : 'rgba(255,255,255,0.04)'}`,
            }}>
            <div className="w-8 flex-shrink-0"><RankBadge rank={i} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-['Cinzel'] font-semibold text-sm truncate group-hover:underline"
                style={{ color: CLASS_COLORS[p.class] ?? '#fff' }}>{p.name}</div>
              <div className="text-xs text-slate-500">{CLASS_NAMES[p.class] ?? 'Desconocido'}{p.guild ? ` • ${p.guild}` : ''}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-['Cinzel'] font-bold text-sm" style={{ color: '#F6B40E' }}>
                {Number(p[valueKey]).toLocaleString('es-AR')}
              </div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  )
}

const tabs = [
  { id: 'honor', label: 'Honor', Icon: Shield },
  { id: 'arena', label: 'Arena', Icon: Zap },
  { id: 'level', label: 'Nivel', Icon: TrendingUp },
]

export function TopPvPTabs({ honor, arena, level }: Props) {
  const [active, setActive] = useState('honor')

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 sm:gap-2 mb-6 p-1 rounded-xl w-full sm:w-fit"
        style={{ background: 'rgba(5,15,38,0.8)', border: '1px solid rgba(117,199,255,0.1)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className="relative flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium font-['Cinzel'] transition-all duration-200"
            style={{ color: active === t.id ? '#fff' : '#4a5568' }}>
            {active === t.id && (
              <motion.div layoutId="tab-indicator"
                className="absolute inset-0 rounded-lg"
                style={{ background: 'rgba(117,199,255,0.1)', border: '1px solid rgba(117,199,255,0.2)' }}
              />
            )}
            <t.Icon className="w-4 h-4 relative z-10" style={{ color: active === t.id ? '#75C7FF' : 'currentColor' }} />
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {active === 'honor' && <PlayerTable players={honor} valueKey="totalHonorPoints" label="Honor" />}
          {active === 'arena' && <PlayerTable players={arena} valueKey="arenaPoints" label="Puntos Arena" />}
          {active === 'level' && <PlayerTable players={level} valueKey="level" label="Nivel" />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
