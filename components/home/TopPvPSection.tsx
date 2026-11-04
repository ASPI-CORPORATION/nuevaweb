import Link from 'next/link'
import { queryCharacters } from '@/lib/db'
import { Trophy } from 'lucide-react'

interface TopPlayer {
  name: string
  race: number
  class: number
  totalHonorPoints: number
  arenaPoints: number
}

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

async function getTopHonor(): Promise<TopPlayer[]> {
  try {
    return await queryCharacters<TopPlayer>(
      `SELECT name, race, class, totalHonorPoints, arenaPoints
       FROM characters
       WHERE totalHonorPoints > 0 AND deleteinfos_account IS NULL
       ORDER BY totalHonorPoints DESC
       LIMIT 5`
    )
  } catch {
    return []
  }
}

export async function TopPvPSection() {
  const top = await getTopHonor()

  return (
    <section className="relative z-10 py-24 px-4 bg-gradient-to-b from-transparent via-red-950/5 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-['Cinzel'] font-black text-4xl text-white mb-2">
              Top{' '}
              <span style={{
                background: 'linear-gradient(135deg, #FFD700, #FFF8E1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                PvP
              </span>
            </h2>
            <p className="text-slate-400">Los guerreros más honorables de Rasganorte</p>
          </div>
          <Link
            href="/rankings"
            className="hidden md:flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            Rankings completos →
          </Link>
        </div>

        {top.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p>Todavía no hay guerreros con honor. ¡Sé el primero!</p>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            {top.map((player, i) => (
              <Link
                key={player.name}
                href={`/armory/${player.name}`}
                className="flex items-center gap-4 px-6 py-4 border-b border-slate-700/30 last:border-0 hover:bg-blue-500/5 transition-colors group"
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {i === 0 ? (
                    <Trophy className="w-6 h-6 text-yellow-400 mx-auto" />
                  ) : i === 1 ? (
                    <span className="font-['Cinzel'] font-bold text-slate-300 text-lg">2</span>
                  ) : i === 2 ? (
                    <span className="font-['Cinzel'] font-bold text-orange-400 text-lg">3</span>
                  ) : (
                    <span className="font-['Cinzel'] font-bold text-slate-500 text-lg">{i + 1}</span>
                  )}
                </div>

                {/* Name + Class */}
                <div className="flex-1">
                  <div
                    className="font-semibold group-hover:underline transition-colors"
                    style={{ color: CLASS_COLORS[player.class] || '#FFFFFF' }}
                  >
                    {player.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {CLASS_NAMES[player.class] || 'Desconocido'}
                  </div>
                </div>

                {/* Honor */}
                <div className="text-right">
                  <div className="font-['Cinzel'] font-semibold text-yellow-400">
                    {player.totalHonorPoints.toLocaleString('es-AR')}
                  </div>
                  <div className="text-xs text-slate-500">Honor</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
