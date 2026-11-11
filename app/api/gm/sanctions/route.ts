import { NextRequest, NextResponse } from 'next/server'
import { requireGm } from '@/lib/gm/access.server'
import { AUTH_DB, CHARACTERS_DB, queryCms } from '@/lib/db'
import { actionErrorResponse } from '@/lib/gm/http.server'

/**
 * Sanctions overview:
 *  - `active`: bans in force right now, read from AzerothCore (account_banned / character_banned)
 *  - `panel`: sanctions applied from this panel (cms_gm_sanctions), with the responsible GM
 */
export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'viewSanctions')
  if (ctx instanceof Response) return ctx
  const status = req.nextUrl.searchParams.get('status')
  try {
    const [accountBans, characterBans, panel] = await Promise.all([
      queryCms<{ account_id: number; username: string; bandate: number; unbandate: number; bannedby: string; banreason: string }>(
        `SELECT b.id AS account_id, a.username, b.bandate, b.unbandate, b.bannedby, b.banreason
         FROM ${AUTH_DB}.account_banned b JOIN ${AUTH_DB}.account a ON a.id = b.id
         WHERE b.active = 1 AND (b.unbandate = b.bandate OR b.unbandate > UNIX_TIMESTAMP())
         ORDER BY b.bandate DESC LIMIT 200`
      ).catch(() => []),
      queryCms<{ guid: number; name: string; account_id: number; bandate: number; unbandate: number; bannedby: string; banreason: string }>(
        `SELECT b.guid, c.name, c.account AS account_id, b.bandate, b.unbandate, b.bannedby, b.banreason
         FROM ${CHARACTERS_DB}.character_banned b JOIN ${CHARACTERS_DB}.characters c ON c.guid = b.guid
         WHERE b.active = 1 AND (b.unbandate = b.bandate OR b.unbandate > UNIX_TIMESTAMP())
         ORDER BY b.bandate DESC LIMIT 200`
      ).catch(() => []),
      queryCms<Record<string, unknown>>(
        `SELECT id, type, account_id, account_name, character_name, gm_name, gm_tier, reason, duration_key,
                starts_at, ends_at, status, revoked_by_name, revoked_at
         FROM cms_gm_sanctions ${status === 'activa' || status === 'revocada' ? 'WHERE status = ?' : ''}
         ORDER BY starts_at DESC LIMIT 200`,
        status === 'activa' || status === 'revocada' ? [status] : []
      ).catch(() => []),
    ])
    const toActive = (r: { bandate: number; unbandate: number; bannedby: string; banreason: string }) => {
      const m = r.banreason?.match(/^\[GM ([^\]]+)\]\s*(.*)$/)
      return {
        start: new Date(r.bandate * 1000).toISOString(),
        end: r.unbandate === r.bandate ? null : new Date(r.unbandate * 1000).toISOString(),
        gm: m ? m[1] : r.bannedby, reason: m ? m[2] : r.banreason,
      }
    }
    return NextResponse.json({
      active: [
        ...accountBans.map(r => ({ type: 'Ban de cuenta', accountId: r.account_id, target: r.username, ...toActive(r) })),
        ...characterBans.map(r => ({ type: 'Ban de personaje', accountId: r.account_id, target: r.name, ...toActive(r) })),
      ].sort((a, b) => b.start.localeCompare(a.start)),
      panel,
    })
  } catch (err) {
    return actionErrorResponse(err, 'sanctions:list')
  }
}
