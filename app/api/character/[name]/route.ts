import { NextResponse } from 'next/server'
import { queryCharactersFirst, queryCharacters } from '@/lib/db'

export interface EquippedItem {
  slot: number
  itemEntry: number
  itemName: string
  quality: number
  itemLevel: number
  displayId: number
  inventoryType: number
  socketColor1: number
  socketColor2: number
  socketColor3: number
  stats: Array<{ type: number; value: number }>
}

export interface CharacterArmoryData {
  guid: number
  name: string
  race: number
  class: number
  level: number
  gender: number
  totalHonorPoints: number
  arenaPoints: number
  totalKills: number
  online: number
  guildName: string | null
  totaltime: number
  avgIlvl: number
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const characterName = decodeURIComponent(name)

    const character = await queryCharactersFirst<{
      guid: number; name: string; race: number; class: number; level: number; gender: number
      totalHonorPoints: number; arenaPoints: number; totalKills: number
      online: number; guildid: number; totaltime: number
    }>(
      `SELECT guid, name, race, class, level, gender,
              totalHonorPoints, arenaPoints, totalKills,
              online, guildid, totaltime
         FROM characters
        WHERE name = ? AND deleteinfos_account IS NULL`,
      [characterName],
    )

    if (!character) {
      return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })
    }

    let guildName: string | null = null
    if (character.guildid) {
      const guild = await queryCharactersFirst<{ name: string }>(
        'SELECT name FROM guild WHERE guildid = ?',
        [character.guildid],
      )
      guildName = guild?.name ?? null
    }

    const rows = await queryCharacters<{
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
         COALESCE(it.stat_type1,  0) AS s1t, COALESCE(it.stat_value1,  0) AS s1v,
         COALESCE(it.stat_type2,  0) AS s2t, COALESCE(it.stat_value2,  0) AS s2v,
         COALESCE(it.stat_type3,  0) AS s3t, COALESCE(it.stat_value3,  0) AS s3v,
         COALESCE(it.stat_type4,  0) AS s4t, COALESCE(it.stat_value4,  0) AS s4v,
         COALESCE(it.stat_type5,  0) AS s5t, COALESCE(it.stat_value5,  0) AS s5v,
         COALESCE(it.stat_type6,  0) AS s6t, COALESCE(it.stat_value6,  0) AS s6v,
         COALESCE(it.stat_type7,  0) AS s7t, COALESCE(it.stat_value7,  0) AS s7v,
         COALESCE(it.stat_type8,  0) AS s8t, COALESCE(it.stat_value8,  0) AS s8v
       FROM character_inventory ci
       JOIN item_instance  ii ON ci.item       = ii.guid
       JOIN item_template  it ON ii.itemEntry  = it.entry
      WHERE ci.guid = ? AND ci.bag = 255 AND ci.slot BETWEEN 0 AND 18
      ORDER BY ci.slot`,
      [character.guid],
    )

    const equipped: Record<number, EquippedItem> = {}
    for (const r of rows) {
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

    const iLvlSlots = rows.filter(r => r.slot !== 3 && r.slot !== 18)
    const avgIlvl = iLvlSlots.length
      ? Math.round(iLvlSlots.reduce((s, r) => s + r.itemLevel, 0) / iLvlSlots.length)
      : 0

    return NextResponse.json({
      character: {
        guid: character.guid,
        name: character.name,
        race: character.race,
        class: character.class,
        level: character.level,
        gender: character.gender,
        totalHonorPoints: character.totalHonorPoints,
        arenaPoints: character.arenaPoints,
        totalKills: character.totalKills,
        online: character.online,
        guildName,
        totaltime: character.totaltime,
        avgIlvl,
      } satisfies CharacterArmoryData,
      equipped,
    })
  } catch (err) {
    console.error('[Armory API]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
