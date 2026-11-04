import { notFound } from 'next/navigation'
import { queryCharactersFirst, queryCharacters, queryWorld } from '@/lib/db'
import { ArrowLeft, Sword, Shield, Users } from 'lucide-react'
import Link from 'next/link'

interface Character {
  guid: number
  name: string
  race: number
  class: number
  level: number
  gender: number
  totalHonorPoints: number
  arenaPoints: number
  totalKills: number
  today_kills: number
  online: number
  guildid: number
  map: number
  zone: number
  totaltime: number
}

interface GuildInfo { name: string }

const CLASS_NAMES: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladín', 3: 'Cazador', 4: 'Pícaro',
  5: 'Sacerdote', 6: 'Caballero de la Muerte', 7: 'Chamán',
  8: 'Mago', 9: 'Brujo', 11: 'Druida',
}
const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569',
  5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0',
  9: '#9482C9', 11: '#FF7D0A',
}
const RACE_NAMES: Record<number, string> = {
  1: 'Humano', 2: 'Orco', 3: 'Enano', 4: 'Elfo de la Noche',
  5: 'No Muerto', 6: 'Tauren', 7: 'Gnomo', 8: 'Troll',
  10: 'Elfo de Sangre', 11: 'Draenei', 22: 'Renegado',
}
const FACTION: Record<number, string> = {
  1: 'Alianza', 3: 'Alianza', 4: 'Alianza', 11: 'Alianza',
  2: 'Horda', 5: 'Horda', 6: 'Horda', 8: 'Horda', 10: 'Horda', 22: 'Horda',
}

function formatPlaytime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return `${days}d ${hours}h`
}

export default async function ArmoryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params

  let character: Character | null = null
  let guild: GuildInfo | null = null

  try {
    character = await queryCharactersFirst<Character>(
      'SELECT guid, name, race, class, level, gender, totalHonorPoints, arenaPoints, totalKills, today_kills, online, guildid, map, zone, totaltime FROM characters WHERE name = ? AND deleteinfos_account IS NULL',
      [decodeURIComponent(name)]
    )

    if (character?.guildid) {
      guild = await queryCharactersFirst<GuildInfo>(
        'SELECT name FROM guild WHERE guildid = ?',
        [character.guildid]
      )
    }
  } catch {
    // DB no disponible
  }

  if (!character) notFound()

  const classColor = CLASS_COLORS[character.class] || '#FFFFFF'
  const className = CLASS_NAMES[character.class] || 'Desconocido'
  const raceName = RACE_NAMES[character.race] || 'Desconocida'

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/rankings" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Rankings
        </Link>

        {/* Profile card */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar placeholder */}
            <div
              className="w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-5xl bg-slate-800 flex-shrink-0"
              style={{ borderColor: classColor + '60' }}
            >
              ⚔️
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-['Cinzel'] font-black text-3xl" style={{ color: classColor }}>
                  {character.name}
                </h1>
                {character.online ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3 text-sm mb-3">
                <span style={{ color: classColor }}>{className}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">Nivel {character.level}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">{raceName}</span>
                {guild && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {guild.name}
                    </span>
                  </>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Tiempo jugado: {formatPlaytime(character.totaltime)}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Honor Total', value: character.totalHonorPoints.toLocaleString('es-AR'), color: '#FFD700' },
            { label: 'Puntos Arena', value: character.arenaPoints.toLocaleString('es-AR'), color: '#75C7FF' },
            { label: 'Kills Totales', value: character.totalKills.toLocaleString('es-AR'), color: '#FF6B6B' },
            { label: 'Kills de Hoy', value: character.today_kills.toLocaleString('es-AR'), color: '#90EE90' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className="font-['Cinzel'] font-bold text-2xl mb-1" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Equipo placeholder */}
        <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-6">
          <h2 className="font-['Cinzel'] font-semibold text-white mb-4">Equipo</h2>
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Vista de equipo disponible pronto</p>
          </div>
        </div>
      </div>
    </div>
  )
}
