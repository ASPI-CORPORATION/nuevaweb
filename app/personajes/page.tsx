import Link from 'next/link'
import { queryCharacters } from '@/lib/db'
import { Users, Search } from 'lucide-react'

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

interface SearchParams {
  q?: string
  page?: string
}

const PER_PAGE = 50

export default async function PersonajesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp    = await searchParams
  const q     = sp.q?.trim() ?? ''
  const page  = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PER_PAGE

  let characters: Array<{
    guid: number; name: string; level: number; class: number; race: number
    online: number; guildid: number; guildName: string | null
  }> = []
  let total = 0

  try {
    const likeQ = q ? `%${q}%` : '%'
    const countRes = await queryCharacters<{ c: number }>(
      'SELECT COUNT(*) as c FROM characters WHERE name LIKE ? AND deleteinfos_account IS NULL AND level > 0',
      [likeQ],
    )
    total = Number(countRes[0]?.c ?? 0)

    const rows = await queryCharacters<{
      guid: number; name: string; level: number; class: number; race: number
      online: number; guildid: number
    }>(
      `SELECT guid, name, level, class, race, online, guildid
         FROM characters
        WHERE name LIKE ? AND deleteinfos_account IS NULL AND level > 0
        ORDER BY level DESC, name ASC
        LIMIT ? OFFSET ?`,
      [likeQ, PER_PAGE, offset],
    )

    // Batch guild names
    const guildIds = [...new Set(rows.map(r => r.guildid).filter(id => id > 0))]
    const guildMap: Record<number, string> = {}
    if (guildIds.length > 0) {
      const guilds = await queryCharacters<{ guildid: number; name: string }>(
        `SELECT guildid, name FROM guild WHERE guildid IN (${guildIds.map(() => '?').join(',')})`,
        guildIds,
      )
      for (const g of guilds) guildMap[g.guildid] = g.name
    }

    characters = rows.map(r => ({
      ...r,
      guildName: r.guildid ? (guildMap[r.guildid] ?? null) : null,
    }))
  } catch {
    // DB unavailable — empty state
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="font-['Cinzel'] font-black text-4xl text-white">Personajes</h1>
            <p className="text-slate-400 text-sm">Explorar el armory de los aventureros de WoW Argentina</p>
          </div>
        </div>

        {/* Search form */}
        <form method="GET" className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar personaje…"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/50 text-white rounded-xl text-sm outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-xl text-sm font-medium transition-colors"
          >
            Buscar
          </button>
          {q && (
            <Link
              href="/personajes"
              className="px-4 py-2.5 bg-slate-800/50 border border-slate-700/40 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              ✕
            </Link>
          )}
        </form>

        {/* Results info */}
        <p className="text-xs text-slate-500 mb-4">
          {total.toLocaleString('es-AR')} personajes
          {q && ` · búsqueda: "${q}"`}
          {totalPages > 1 && ` · página ${page} de ${totalPages}`}
        </p>

        {/* Character table */}
        {characters.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg mb-1">Sin resultados</p>
            <p className="text-sm">{q ? 'Probá con otro nombre.' : 'No hay personajes disponibles.'}</p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Nombre', 'Clase', 'Raza', 'Nivel', 'Guild', ''].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium text-slate-400 text-xs uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characters.map(char => (
                  <tr
                    key={char.guid}
                    className="border-b border-slate-700/20 last:border-0 hover:bg-blue-500/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-['Cinzel'] font-semibold"
                          style={{ color: CLASS_COLORS[char.class] ?? '#fff' }}
                        >
                          {char.name}
                        </span>
                        {char.online ? (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block flex-shrink-0"
                            title="Online"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {CLASS_NAMES[char.class] ?? '?'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {RACE_NAMES[char.race] ?? '?'}
                    </td>
                    <td className="px-4 py-3 font-mono text-white">
                      {char.level}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {char.guildName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/armory/${encodeURIComponent(char.name)}`}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                        style={{
                          background: `${CLASS_COLORS[char.class] ?? '#75C7FF'}15`,
                          border: `1px solid ${CLASS_COLORS[char.class] ?? '#75C7FF'}30`,
                          color: CLASS_COLORS[char.class] ?? '#75C7FF',
                        }}
                      >
                        Ver Armory
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <Link
                href={`/personajes?q=${encodeURIComponent(q)}&page=${page - 1}`}
                className="px-4 py-2 text-sm bg-slate-800/50 border border-slate-700/40 text-slate-300 hover:text-white rounded-xl transition-colors"
              >
                ← Anterior
              </Link>
            )}
            <span className="text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/personajes?q=${encodeURIComponent(q)}&page=${page + 1}`}
                className="px-4 py-2 text-sm bg-slate-800/50 border border-slate-700/40 text-slate-300 hover:text-white rounded-xl transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
