import { notFound } from 'next/navigation'
import { queryCharactersFirst, queryCharacters } from '@/lib/db'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import ArmoryPaperdoll, { type EquippedItem } from '@/components/armory/ArmoryPaperdoll'

// ── Static maps ───────────────────────────────────────────────────────────────

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
  1: 'Humano',  2: 'Orco',   3: 'Enano',  4: 'Elfo de la Noche',
  5: 'No Muerto', 6: 'Tauren', 7: 'Gnomo', 8: 'Troll',
  10: 'Elfo de Sangre', 11: 'Draenei', 22: 'Renegado',
}

function formatPlaytime(seconds: number): string {
  const days  = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return `${days}d ${hours}h`
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getArmoryData(characterName: string) {
  const character = await queryCharactersFirst<{
    guid: number; name: string; race: number; class: number; level: number; gender: number
    totalHonorPoints: number; arenaPoints: number; totalKills: number; today_kills: number
    online: number; guildid: number; totaltime: number
  }>(
    `SELECT guid, name, race, class, level, gender,
            totalHonorPoints, arenaPoints, totalKills, today_kills,
            online, guildid, totaltime
       FROM characters
      WHERE name = ? AND deleteinfos_account IS NULL`,
    [characterName],
  )

  if (!character) return null

  const [guild, equipRows] = await Promise.all([
    character.guildid
      ? queryCharactersFirst<{ name: string }>(
          'SELECT name FROM guild WHERE guildid = ?',
          [character.guildid],
        )
      : Promise.resolve(null),

    queryCharacters<{
      slot: number; itemEntry: number; itemName: string; quality: number; itemLevel: number
      displayId: number; inventoryType: number
      sc1: number; sc2: number; sc3: number
      s1t: number; s1v: number; s2t: number; s2v: number; s3t: number; s3v: number
      s4t: number; s4v: number; s5t: number; s5v: number; s6t: number; s6v: number
      s7t: number; s7v: number; s8t: number; s8v: number
    }>(
      `SELECT
         ci.slot,
         it.entry          AS itemEntry,
         it.name           AS itemName,
         it.Quality        AS quality,
         it.ItemLevel      AS itemLevel,
         it.displayid      AS displayId,
         it.InventoryType  AS inventoryType,
         COALESCE(it.socketColor_1, 0) AS sc1,
         COALESCE(it.socketColor_2, 0) AS sc2,
         COALESCE(it.socketColor_3, 0) AS sc3,
         COALESCE(it.stat_type1, 0) AS s1t, COALESCE(it.stat_value1, 0) AS s1v,
         COALESCE(it.stat_type2, 0) AS s2t, COALESCE(it.stat_value2, 0) AS s2v,
         COALESCE(it.stat_type3, 0) AS s3t, COALESCE(it.stat_value3, 0) AS s3v,
         COALESCE(it.stat_type4, 0) AS s4t, COALESCE(it.stat_value4, 0) AS s4v,
         COALESCE(it.stat_type5, 0) AS s5t, COALESCE(it.stat_value5, 0) AS s5v,
         COALESCE(it.stat_type6, 0) AS s6t, COALESCE(it.stat_value6, 0) AS s6v,
         COALESCE(it.stat_type7, 0) AS s7t, COALESCE(it.stat_value7, 0) AS s7v,
         COALESCE(it.stat_type8, 0) AS s8t, COALESCE(it.stat_value8, 0) AS s8v
       FROM character_inventory ci
       JOIN item_instance  ii ON ci.item       = ii.guid
       JOIN item_template  it ON ii.itemEntry  = it.entry
      WHERE ci.guid = ? AND ci.bag = 255 AND ci.slot BETWEEN 0 AND 18
      ORDER BY ci.slot`,
      [character.guid],
    ),
  ])

  const equipped: Record<number, EquippedItem> = {}
  for (const r of equipRows) {
    equipped[r.slot] = {
      slot: r.slot,
      itemEntry: r.itemEntry,
      itemName: r.itemName,
      quality: r.quality,
      itemLevel: r.itemLevel,
      displayId: r.displayId,
      inventoryType: r.inventoryType,
      socketColor1: r.sc1,
      socketColor2: r.sc2,
      socketColor3: r.sc3,
      stats: [
        { type: r.s1t, value: r.s1v }, { type: r.s2t, value: r.s2v },
        { type: r.s3t, value: r.s3v }, { type: r.s4t, value: r.s4v },
        { type: r.s5t, value: r.s5v }, { type: r.s6t, value: r.s6v },
        { type: r.s7t, value: r.s7v }, { type: r.s8t, value: r.s8v },
      ].filter(s => s.type > 0 && s.value !== 0),
    }
  }

  const iLvlSlots = equipRows.filter(r => r.slot !== 3 && r.slot !== 18)
  const avgIlvl = iLvlSlots.length
    ? Math.round(iLvlSlots.reduce((s, r) => s + r.itemLevel, 0) / iLvlSlots.length)
    : 0

  return { character, guildName: guild?.name ?? null, equipped, avgIlvl }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArmoryPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const characterName = decodeURIComponent(name)

  let data: Awaited<ReturnType<typeof getArmoryData>> = null

  try {
    data = await getArmoryData(characterName)
  } catch {
    // DB unavailable — fall through to notFound
  }

  if (!data) notFound()

  const { character, guildName, equipped, avgIlvl } = data
  const classColor = CLASS_COLORS[character.class] ?? '#FFFFFF'
  const className  = CLASS_NAMES[character.class]  ?? 'Desconocido'
  const raceName   = RACE_NAMES[character.race]    ?? 'Desconocida'

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Back link */}
        <Link
          href="/personajes"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Personajes
        </Link>

        {/* ── Character card ── */}
        <div
          className="rounded-2xl p-6 md:p-8 mb-6"
          style={{
            background: 'rgba(10,22,40,0.7)',
            border: `1px solid ${classColor}25`,
            boxShadow: `0 0 40px ${classColor}0a`,
          }}
        >
          <div className="flex items-start gap-5 flex-wrap md:flex-nowrap">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl bg-slate-800/60 flex-shrink-0"
              style={{ border: `2px solid ${classColor}50` }}
            >
              ⚔️
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1
                  className="font-['Cinzel'] font-black text-3xl"
                  style={{ color: classColor }}
                >
                  {character.name}
                </h1>
                {character.online ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Online
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mb-3">
                <span style={{ color: classColor }}>{className}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">Nivel {character.level}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{raceName}</span>
                {guildName && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />{guildName}
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-slate-600">
                Tiempo jugado: {formatPlaytime(character.totaltime)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Honor Total',   value: character.totalHonorPoints, color: '#FFD700' },
            { label: 'Puntos Arena',  value: character.arenaPoints,      color: '#75C7FF' },
            { label: 'Kills Totales', value: character.totalKills,       color: '#FF6B6B' },
            { label: 'Kills de Hoy',  value: character.today_kills,      color: '#90EE90' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(10,22,40,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="font-['Cinzel'] font-bold text-2xl mb-1" style={{ color: s.color }}>
                {s.value.toLocaleString('es-AR')}
              </div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Equipment / Paperdoll ── */}
        <div
          className="rounded-2xl p-5 md:p-8"
          style={{
            background: 'rgba(10,22,40,0.5)',
            border: '1px solid rgba(117,199,255,0.08)',
          }}
        >
          <h2 className="font-['Cinzel'] font-semibold text-white mb-6 text-lg">Equipo</h2>
          <ArmoryPaperdoll
            equipped={equipped as unknown as Record<string, EquippedItem>}
            avgIlvl={avgIlvl}
          />
        </div>

      </div>
    </div>
  )
}
