'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Sword, Shield, Star, Users } from 'lucide-react'
import Link from 'next/link'

interface RankingsData {
  honor: Array<{ name: string; race: number; class: number; level: number; totalHonorPoints: number; guildid: number }>
  arena2v2: Array<{ name: string; rating: number; wins: number; losses: number }>
  arena3v3: Array<{ name: string; rating: number; wins: number; losses: number }>
  level: Array<{ name: string; race: number; class: number; level: number; totaltime: number }>
  guilds: Array<{ name: string; membersCount: number; leaderguid: number }>
  CLASS_NAMES: Record<number, string>
  CLASS_COLORS: Record<number, string>
  RACE_NAMES: Record<number, string>
}

const TABS = [
  { id: 'honor', label: 'Top Honor', icon: Sword },
  { id: 'arena2v2', label: 'Arena 2v2', icon: Shield },
  { id: 'arena3v3', label: 'Arena 3v3', icon: Shield },
  { id: 'level', label: 'Top Nivel', icon: Star },
  { id: 'guilds', label: 'Guilds', icon: Users },
]

function RankRow({ rank, name, sub, main, secondary, color }: {
  rank: number; name: string; sub?: string; main: string | number; secondary?: string; color?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.02 }}
      className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/30 last:border-0 hover:bg-blue-500/5 transition-colors group"
    >
      <div className="w-8 text-center flex-shrink-0">
        {rank === 1 ? (
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto" />
        ) : rank === 2 ? (
          <span className="font-['Cinzel'] font-bold text-slate-300">2</span>
        ) : rank === 3 ? (
          <span className="font-['Cinzel'] font-bold text-orange-400">3</span>
        ) : (
          <span className="font-['Cinzel'] text-slate-500 text-sm">{rank}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/armory/${name}`} className="font-semibold hover:underline truncate block" style={{ color: color || '#fff' }}>
          {name}
        </Link>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-['Cinzel'] font-semibold text-yellow-400 text-sm">
          {typeof main === 'number' ? main.toLocaleString('es-AR') : main}
        </div>
        {secondary && <div className="text-xs text-slate-500">{secondary}</div>}
      </div>
    </motion.div>
  )
}

export function RankingsTabs({ data }: { data: RankingsData }) {
  const [active, setActive] = useState('honor')

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active === tab.id
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          {active === 'honor' && (
            data.honor.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay datos disponibles</div>
            ) : data.honor.map((p, i) => (
              <RankRow
                key={p.name} rank={i + 1} name={p.name}
                sub={`${data.CLASS_NAMES[p.class] || '?'} - Nivel ${p.level}`}
                main={p.totalHonorPoints} secondary="Honor"
                color={data.CLASS_COLORS[p.class]}
              />
            ))
          )}

          {active === 'arena2v2' && (
            data.arena2v2.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay datos disponibles</div>
            ) : data.arena2v2.map((p, i) => (
              <RankRow
                key={i} rank={i + 1} name={p.name}
                sub={`${p.wins}V / ${p.losses}D`}
                main={p.rating} secondary="Rating"
              />
            ))
          )}

          {active === 'arena3v3' && (
            data.arena3v3.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay datos disponibles</div>
            ) : data.arena3v3.map((p, i) => (
              <RankRow
                key={i} rank={i + 1} name={p.name}
                sub={`${p.wins}V / ${p.losses}D`}
                main={p.rating} secondary="Rating"
              />
            ))
          )}

          {active === 'level' && (
            data.level.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay datos disponibles</div>
            ) : data.level.map((p, i) => (
              <RankRow
                key={p.name} rank={i + 1} name={p.name}
                sub={data.CLASS_NAMES[p.class] || '?'}
                main={`Nivel ${p.level}`}
                color={data.CLASS_COLORS[p.class]}
              />
            ))
          )}

          {active === 'guilds' && (
            data.guilds.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay datos disponibles</div>
            ) : data.guilds.map((g, i) => (
              <RankRow
                key={g.name} rank={i + 1} name={g.name}
                main={g.membersCount} secondary="Miembros"
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
