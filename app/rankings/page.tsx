import { Suspense } from 'react'
import { queryCharacters } from '@/lib/db'
import { RankingsTabs } from '@/components/rankings/RankingsTabs'
import { Trophy } from 'lucide-react'

// Rankings read live character data; without this the page was frozen at build time
export const revalidate = 60

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

async function getRankingsData() {
  try {
    const [honor, arena2v2, arena3v3, level, guilds] = await Promise.all([
      queryCharacters<{
        name: string; race: number; class: number; level: number; totalHonorPoints: number; guildid: number
      }>(
        `SELECT c.name, c.race, c.class, c.level, c.totalHonorPoints, c.guildid
         FROM characters c WHERE c.totalHonorPoints > 0 AND c.deleteinfos_account IS NULL
         ORDER BY c.totalHonorPoints DESC LIMIT 100`
      ).catch(() => []),

      queryCharacters<{
        name: string; rating: number; wins: number; losses: number
      }>(
        `SELECT at.name, atm.personalRating as rating,
                atm.weekWins as wins, atm.weekGames - atm.weekWins as losses
         FROM arena_team at
         JOIN arena_team_member atm ON at.arenaTeamId = atm.arenaTeamId
         WHERE at.type = 2
         ORDER BY atm.personalRating DESC LIMIT 50`
      ).catch(() => []),

      queryCharacters<{
        name: string; rating: number; wins: number; losses: number
      }>(
        `SELECT at.name, atm.personalRating as rating,
                atm.weekWins as wins, atm.weekGames - atm.weekWins as losses
         FROM arena_team at
         JOIN arena_team_member atm ON at.arenaTeamId = atm.arenaTeamId
         WHERE at.type = 3
         ORDER BY atm.personalRating DESC LIMIT 50`
      ).catch(() => []),

      queryCharacters<{
        name: string; race: number; class: number; level: number; totaltime: number
      }>(
        `SELECT name, race, class, level, totaltime
         FROM characters WHERE deleteinfos_account IS NULL
         ORDER BY level DESC, totaltime ASC LIMIT 100`
      ).catch(() => []),

      queryCharacters<{
        name: string; membersCount: number; leaderguid: number
      }>(
        `SELECT g.name, g.membersCount, g.leaderguid
         FROM guild g ORDER BY g.membersCount DESC LIMIT 50`
      ).catch(() => []),
    ])

    return { honor, arena2v2, arena3v3, level, guilds, CLASS_NAMES, CLASS_COLORS, RACE_NAMES }
  } catch {
    return { honor: [], arena2v2: [], arena3v3: [], level: [], guilds: [], CLASS_NAMES, CLASS_COLORS, RACE_NAMES }
  }
}

export default async function RankingsPage() {
  const data = await getRankingsData()

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="font-['Cinzel'] font-black text-4xl text-white">Rankings</h1>
              <p className="text-slate-400 text-sm">Los mejores guerreros de Rasganorte</p>
            </div>
          </div>
        </div>

        <RankingsTabs data={data} />
      </div>
    </div>
  )
}
