import { NextRequest, NextResponse } from 'next/server'
import { requireGm } from '@/lib/gm/access.server'
import { AUTH_DB, queryCharacters } from '@/lib/db'
import { actionErrorResponse } from '@/lib/gm/http.server'
import { CLASS_NAMES, RACE_NAMES, factionOf, zoneName } from '@/lib/gm/wow-data'

/** Character search across acore_characters (name or exact GUID). `online=1` lists only connected players. */
export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'viewCharacters')
  if (ctx instanceof Response) return ctx

  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim().slice(0, 24)
  const onlineOnly = sp.get('online') === '1'
  const faction = sp.get('faction')
  const classId = Number(sp.get('class') || 0)
  const page = Math.max(1, Number(sp.get('page') || 1) || 1)
  const pageSize = 30

  const where = ['c.deleteInfos_Account IS NULL']
  const params: unknown[] = []
  if (q) {
    if (/^\d+$/.test(q)) { where.push('(c.guid = ? OR c.name LIKE ?)'); params.push(Number(q), `%${q}%`) }
    else { where.push('c.name LIKE ?'); params.push(`%${q}%`) }
  }
  if (onlineOnly) where.push('c.online = 1')
  if (faction === 'Alianza') where.push('c.race IN (1,3,4,7,11)')
  if (faction === 'Horda') where.push('c.race IN (2,5,6,8,10)')
  if (classId) { where.push('c.class = ?'); params.push(classId) }
  if (!q && !onlineOnly) return NextResponse.json({ characters: [], total: 0, page, pageSize })

  try {
    const whereSql = where.join(' AND ')
    const [rows, total] = await Promise.all([
      queryCharacters<{
        guid: number; name: string; account: number; username: string | null; race: number; class: number; level: number
        zone: number; online: number; guild: string | null; last_login: Date | null
      }>(
        `SELECT c.guid, c.name, c.account, a.username, c.race, c.class, c.level, c.zone, c.online, g.name AS guild,
                a.last_login
         FROM characters c
         LEFT JOIN ${AUTH_DB}.account a ON a.id = c.account
         LEFT JOIN guild_member gm ON gm.guid = c.guid
         LEFT JOIN guild g ON g.guildid = gm.guildid
         WHERE ${whereSql}
         ORDER BY c.online DESC, c.level DESC, c.name
         LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize]
      ),
      queryCharacters<{ c: number }>(`SELECT COUNT(*) AS c FROM characters c WHERE ${whereSql}`, params),
    ])
    return NextResponse.json({
      page, pageSize, total: Number(total[0]?.c ?? 0),
      characters: rows.map(r => ({
        guid: r.guid, name: r.name, accountId: r.account, accountName: r.username,
        level: r.level, classId: r.class, className: CLASS_NAMES[r.class] ?? `Clase ${r.class}`,
        raceName: RACE_NAMES[r.race] ?? `Raza ${r.race}`, raceId: r.race, faction: factionOf(r.race),
        zone: zoneName(r.zone), online: !!r.online, guild: r.guild,
        // Session start = the account's last login (authserver), only meaningful while online
        connectedSince: r.online && r.last_login ? r.last_login : null,
      })),
    })
  } catch (err) {
    return actionErrorResponse(err, 'characters:list')
  }
}
