import { getSession } from '@/lib/auth'
import { queryCharacters } from '@/lib/db'
import { CharacterActions } from '@/components/cuenta/CharacterActions'

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

export default async function PersonajesPage() {
  const session = await getSession()
  if (!session) return null

  let characters: Array<{
    guid: number; name: string; level: number; class: number; race: number; online: number; gender: number
  }> = []

  try {
    characters = await queryCharacters(
      'SELECT guid, name, level, class, race, online, gender FROM characters WHERE account = ? AND deleteinfos_account IS NULL',
      [session.id]
    )
  } catch {}

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Mis Personajes</h1>

      {characters.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg mb-2">No tenés personajes todavía</p>
          <p className="text-sm">Creá uno en el juego y aparecerá acá</p>
        </div>
      ) : (
        <div className="space-y-4">
          {characters.map(char => (
            <div key={char.guid} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-['Cinzel'] font-bold text-lg" style={{ color: CLASS_COLORS[char.class] || '#fff' }}>
                      {char.name}
                    </span>
                    {char.online ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-400">
                    {RACE_NAMES[char.race] || '?'} {CLASS_NAMES[char.class] || '?'} - Nivel {char.level}
                  </div>
                </div>
                <CharacterActions characterName={char.name} isOnline={!!char.online} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
