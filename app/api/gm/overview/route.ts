import { NextRequest, NextResponse } from 'next/server'
import { requireGm } from '@/lib/gm/access.server'
import { AUTH_DB, CHARACTERS_DB, queryCms } from '@/lib/db'
import { getServerStatus, onlineCountFromDb, recordOnlineSnapshot } from '@/lib/gm/status.server'

export const dynamic = 'force-dynamic'

const num = async (p: Promise<Array<{ c: number | string | null }>>): Promise<number | null> =>
  p.then(r => Number(r[0]?.c ?? 0)).catch(() => null)

/** Daily series for the last `days` days; missing days are filled with 0 (they really had no rows). */
async function series(sql: string, days: number, params: unknown[] = []) {
  try {
    const rows = await queryCms<{ d: string; c: number }>(sql, [days, ...params])
    const map = new Map(rows.map(r => [String(r.d), Number(r.c)]))
    const out: Array<{ day: string; value: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 86_400_000)
      const key = dt.toISOString().slice(0, 10)
      out.push({ day: key, value: map.get(key) ?? 0 })
    }
    return out
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'serverStatus')
  if (ctx instanceof Response) return ctx

  const days = 14
  const status = await getServerStatus()
  const dbOnline = await onlineCountFromDb().catch(() => null)
  const onlineNow = status.worldserver.connectedPlayers ?? dbOnline
  if (onlineNow != null) await recordOnlineSnapshot(onlineNow, status.worldserver.connectedPlayers != null ? 'soap' : 'db')

  const [accounts, characters, ticketsOpen, ticketsReview, sanctionsActive, newToday] = await Promise.all([
    num(queryCms(`SELECT COUNT(*) AS c FROM ${AUTH_DB}.account`)),
    num(queryCms(`SELECT COUNT(*) AS c FROM ${CHARACTERS_DB}.characters WHERE deleteInfos_Account IS NULL`)),
    num(queryCms("SELECT COUNT(*) AS c FROM cms_tickets WHERE status IN ('Abierto','Aceptado')")),
    num(queryCms("SELECT COUNT(*) AS c FROM cms_tickets WHERE status = 'En Revisión'")),
    num(queryCms(
      `SELECT (SELECT COUNT(*) FROM ${AUTH_DB}.account_banned WHERE active = 1 AND (unbandate = bandate OR unbandate > UNIX_TIMESTAMP()))
            + (SELECT COUNT(*) FROM ${CHARACTERS_DB}.character_banned WHERE active = 1 AND (unbandate = bandate OR unbandate > UNIX_TIMESTAMP())) AS c`
    )),
    num(queryCms(`SELECT COUNT(*) AS c FROM ${AUTH_DB}.account WHERE joindate >= CURDATE()`)),
  ])

  const [registrations, ticketsIn, ticketsSolved, sanctions] = await Promise.all([
    series(`SELECT DATE_FORMAT(joindate, '%Y-%m-%d') AS d, COUNT(*) AS c FROM ${AUTH_DB}.account
            WHERE joindate >= CURDATE() - INTERVAL ? DAY GROUP BY d`, days),
    series(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS c FROM cms_tickets
            WHERE created_at >= CURDATE() - INTERVAL ? DAY GROUP BY d`, days),
    series(`SELECT DATE_FORMAT(closed_at, '%Y-%m-%d') AS d, COUNT(*) AS c FROM cms_tickets
            WHERE closed_at >= CURDATE() - INTERVAL ? DAY AND status = 'Cerrado' GROUP BY d`, days),
    series(`SELECT DATE_FORMAT(FROM_UNIXTIME(bandate), '%Y-%m-%d') AS d, COUNT(*) AS c FROM (
              SELECT bandate FROM ${AUTH_DB}.account_banned UNION ALL SELECT bandate FROM ${CHARACTERS_DB}.character_banned
            ) b WHERE bandate >= UNIX_TIMESTAMP(CURDATE() - INTERVAL ? DAY) GROUP BY d`, days),
  ])

  const onlineHistory = await queryCms<{ t: Date; players: number }>(
    'SELECT taken_at AS t, players FROM cms_online_snapshots WHERE taken_at > NOW() - INTERVAL 48 HOUR ORDER BY taken_at'
  ).catch(() => null)

  return NextResponse.json({
    status,
    cards: {
      onlinePlayers: onlineNow,
      onlinePlayersSource: status.worldserver.connectedPlayers != null ? 'worldserver' : dbOnline != null ? 'base de personajes' : null,
      accounts, characters, ticketsOpen, ticketsReview, sanctionsActive, newToday,
    },
    charts: {
      registrations, ticketsIn, ticketsSolved, sanctions,
      online: onlineHistory ? onlineHistory.map(r => ({ t: r.t, players: r.players })) : null,
    },
    viewer: { tier: ctx.tier, username: ctx.user.username },
  })
}
