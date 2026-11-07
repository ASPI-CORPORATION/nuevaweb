import { queryCharacters } from '@/lib/db'
import { TopPvPTabs, type PvpPlayer } from './TopPvPTabs'
import { Swords, Trophy } from 'lucide-react'

async function getPvpData() {
  try {
    const [honor, arena, level] = await Promise.all([
      queryCharacters<PvpPlayer>(
        `SELECT c.name, c.class, c.totalHonorPoints, c.arenaPoints, c.level,
                g.name as guild
         FROM characters c
         LEFT JOIN guild_member gm ON gm.guid = c.guid
         LEFT JOIN guild g ON g.guildid = gm.guildid
         WHERE c.totalHonorPoints > 0 AND c.deleteInfos_Name IS NULL
         ORDER BY c.totalHonorPoints DESC LIMIT 10`
      ),
      queryCharacters<PvpPlayer>(
        `SELECT c.name, c.class, c.totalHonorPoints, c.arenaPoints, c.level,
                g.name as guild
         FROM characters c
         LEFT JOIN guild_member gm ON gm.guid = c.guid
         LEFT JOIN guild g ON g.guildid = gm.guildid
         WHERE c.arenaPoints > 0 AND c.deleteInfos_Name IS NULL
         ORDER BY c.arenaPoints DESC LIMIT 10`
      ),
      queryCharacters<PvpPlayer>(
        `SELECT c.name, c.class, c.totalHonorPoints, c.arenaPoints, c.level,
                g.name as guild
         FROM characters c
         LEFT JOIN guild_member gm ON gm.guid = c.guid
         LEFT JOIN guild g ON g.guildid = gm.guildid
         WHERE c.deleteInfos_Name IS NULL
         ORDER BY c.level DESC, c.totalHonorPoints DESC LIMIT 10`
      ),
    ])
    return { honor, arena, level }
  } catch {
    return { honor: [], arena: [], level: [] }
  }
}

export async function TopPvPSection() {
  const { honor, arena, level } = await getPvpData()

  return (
    <section className="relative z-10 py-20 md:py-28 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* Left: header + flavor text */}
          <div className="lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ background: 'rgba(246, 180, 14,0.07)', border: '1px solid rgba(246, 180, 14,0.18)', color: '#F6B40E' }}>
              <Trophy className="w-3.5 h-3.5" /> Tabla de clasificación
            </div>
            <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4 leading-tight">
              Los Mejores{' '}
              <span style={{
                background: 'linear-gradient(135deg, #F6B40E, #FF8C00)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Guerreros
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-md">
              Las leyendas de Rasganorte. Honor ganado en el campo de batalla, puntos de arena forjados en duelo.
            </p>

            {/* Decorative swords */}
            <div className="relative w-48 h-48 hidden lg:block">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(246, 180, 14,0.08) 0%, transparent 70%)',
                    border: '1px solid rgba(246, 180, 14,0.1)',
                  }}>
                  <Swords className="w-14 h-14" style={{ color: 'rgba(246, 180, 14,0.25)' }} />
                </div>
              </div>
            </div>

            {/* Stat strip */}
            <div className="flex gap-6 mt-6">
              {[
                { n: honor.length, label: 'Con Honor' },
                { n: arena.length, label: 'En Arena' },
                { n: level.length, label: 'Top Nivel' },
              ].map(({ n, label }) => (
                <div key={label}>
                  <div className="font-['Cinzel'] font-black text-2xl" style={{ color: '#F6B40E' }}>{n}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: tab component */}
          <div className="rounded-2xl p-5 md:p-6"
            style={{ background: 'rgba(5,15,38,0.8)', border: '1px solid rgba(246, 180, 14,0.1)', backdropFilter: 'blur(14px)' }}>
            <TopPvPTabs honor={honor} arena={arena} level={level} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(246, 180, 14,0.1), transparent)' }} />
    </section>
  )
}
