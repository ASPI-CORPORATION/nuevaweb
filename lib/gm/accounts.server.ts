import {
  AUTH_DB, CHARACTERS_DB, queryAuth, queryAuthFirst, queryCharacters, queryCms,
} from '@/lib/db'
import { getAccountAccess } from '@/lib/auth'
import { maskEmail, maskIp, tierOfAccess } from '@/lib/gm/access.server'
import { geoConfigured, lookupCountry, isPublicIp, syncAccountGeo } from '@/lib/gm/geo.server'
import { can, type GmTier } from '@/lib/gm/permissions'
import { factionOf, zoneName, CLASS_NAMES, RACE_NAMES } from '@/lib/gm/wow-data'

const REALM_ID = Number(process.env.REALM_ID || 1)

/** Active ban as AzerothCore evaluates it: active flag + not expired (permanent: unbandate = bandate). */
const ACTIVE_BAN = (alias: string) =>
  `${alias}.active = 1 AND (${alias}.unbandate = ${alias}.bandate OR ${alias}.unbandate > UNIX_TIMESTAMP())`

export interface AccountFilters {
  q?: string
  country?: string
  from?: string
  to?: string
  status?: 'active' | 'banned'
  online?: 'online' | 'offline'
  withCharacters?: boolean
  gm?: 'staff' | 'players'
  /** Exact effective gmlevel for this realm (0 = players). Requires PII-level access. */
  gmlevel?: number
  sort?: 'id_desc' | 'id_asc' | 'last_login' | 'username'
  page: number
  pageSize: number
}

export async function listAccounts(f: AccountFilters, tier: GmTier) {
  const where: string[] = []
  const params: unknown[] = []

  if (f.q) {
    if (/^\d+$/.test(f.q)) { where.push('(a.id = ? OR a.username LIKE ?)'); params.push(Number(f.q), `%${f.q}%`) }
    else { where.push('a.username LIKE ?'); params.push(`%${f.q}%`) }
  }
  if (f.from) { where.push('a.joindate >= ?'); params.push(`${f.from} 00:00:00`) }
  if (f.to) { where.push('a.joindate <= ?'); params.push(`${f.to} 23:59:59`) }
  if (f.online === 'online') where.push('a.online > 0')
  if (f.online === 'offline') where.push('a.online = 0')
  if (f.status === 'banned') where.push(`EXISTS (SELECT 1 FROM ${AUTH_DB}.account_banned b WHERE b.id = a.id AND ${ACTIVE_BAN('b')})`)
  if (f.status === 'active') where.push(`NOT EXISTS (SELECT 1 FROM ${AUTH_DB}.account_banned b WHERE b.id = a.id AND ${ACTIVE_BAN('b')})`)
  if (f.withCharacters) where.push(`EXISTS (SELECT 1 FROM ${CHARACTERS_DB}.characters c WHERE c.account = a.id AND c.deleteInfos_Account IS NULL)`)
  if (f.gm && can(tier, 'viewPiiMasked')) {
    const staff = `EXISTS (SELECT 1 FROM ${AUTH_DB}.account_access x WHERE x.id = a.id AND x.gmlevel > 0 AND x.RealmID IN (-1, ?))`
    where.push(f.gm === 'staff' ? staff : `NOT ${staff}`)
    params.push(REALM_ID)
  }

  if (f.gmlevel != null && can(tier, 'viewPiiMasked')) {
    where.push(`COALESCE((SELECT MAX(x.gmlevel) FROM ${AUTH_DB}.account_access x WHERE x.id = a.id AND x.RealmID IN (-1, ?)), 0) = ?`)
    params.push(REALM_ID, f.gmlevel)
  }

  let geoEnabled = geoConfigured()
  if (f.country) {
    if (geoEnabled) await syncAccountGeo().catch(() => { geoEnabled = false })
    if (f.country === 'unknown') where.push('(g.country_code IS NULL)')
    else { where.push('g.country_code = ?'); params.push(f.country.toUpperCase().slice(0, 2)) }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const order = {
    id_desc: 'a.id DESC', id_asc: 'a.id ASC', last_login: 'a.last_login DESC', username: 'a.username ASC',
  }[f.sort ?? 'id_desc']
  const from = `FROM ${AUTH_DB}.account a LEFT JOIN cms_account_geo g ON g.account_id = a.id`

  const [rows, totalRow] = await Promise.all([
    queryCms<{
      id: number; username: string; joindate: Date; last_login: Date | null; online: number; locked: number
      banned: number; characters: number; gmlevel: number | null; country_code: string | null; country_name: string | null
    }>(
      `SELECT a.id, a.username, a.joindate, a.last_login, a.online, a.locked,
              EXISTS (SELECT 1 FROM ${AUTH_DB}.account_banned b WHERE b.id = a.id AND ${ACTIVE_BAN('b')}) AS banned,
              (SELECT COUNT(*) FROM ${CHARACTERS_DB}.characters c WHERE c.account = a.id AND c.deleteInfos_Account IS NULL) AS characters,
              (SELECT MAX(x.gmlevel) FROM ${AUTH_DB}.account_access x WHERE x.id = a.id AND x.RealmID IN (-1, ?)) AS gmlevel,
              g.country_code, g.country_name
       ${from} ${whereSql}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`,
      [REALM_ID, ...params, f.pageSize, (f.page - 1) * f.pageSize]
    ),
    queryCms<{ total: number }>(`SELECT COUNT(*) AS total ${from} ${whereSql}`, params),
  ])

  return {
    geoEnabled,
    total: Number(totalRow[0]?.total ?? 0),
    accounts: rows.map(r => ({
      id: r.id,
      username: r.username,
      joindate: r.joindate,
      lastLogin: r.last_login,
      online: r.online > 0,
      locked: !!r.locked,
      banned: !!r.banned,
      characters: Number(r.characters),
      gmlevel: can(tier, 'viewPiiMasked') ? Number(r.gmlevel ?? 0) : null,
      country: r.country_code ? { code: r.country_code, name: r.country_name } : null,
    })),
  }
}

export async function getRealmName(): Promise<string> {
  const r = await queryAuthFirst<{ name: string }>('SELECT name FROM realmlist WHERE id = ?', [REALM_ID]).catch(() => null)
  return r?.name ?? `Reino ${REALM_ID}`
}

export async function getAccountCharacters(accountId: number) {
  const realm = await getRealmName()
  const rows = await queryCharacters<{
    guid: number; name: string; race: number; class: number; gender: number; level: number
    zone: number; map: number; online: number; totaltime: number; guild: string | null
  }>(
    `SELECT c.guid, c.name, c.race, c.class, c.gender, c.level, c.zone, c.map, c.online, c.totaltime, g.name AS guild
     FROM characters c
     LEFT JOIN guild_member gm ON gm.guid = c.guid
     LEFT JOIN guild g ON g.guildid = gm.guildid
     WHERE c.account = ? AND c.deleteInfos_Account IS NULL
     ORDER BY c.level DESC, c.name`,
    [accountId]
  )
  return rows.map(c => ({
    guid: c.guid,
    name: c.name,
    level: c.level,
    classId: c.class,
    className: CLASS_NAMES[c.class] ?? `Clase ${c.class}`,
    raceId: c.race,
    raceName: RACE_NAMES[c.race] ?? `Raza ${c.race}`,
    faction: factionOf(c.race),
    realm,
    zone: zoneName(c.zone),
    online: !!c.online,
    playedHours: Math.round((c.totaltime ?? 0) / 360) / 10,
    guild: c.guild,
  }))
}

interface BanRow { bandate: number; unbandate: number; bannedby: string; banreason: string; active: number }

function sanctionStatus(r: BanRow): 'Activa' | 'Expirada' | 'Revocada' {
  const now = Date.now() / 1000
  const permanent = r.unbandate === r.bandate
  if (r.active && (permanent || r.unbandate > now)) return 'Activa'
  if (!r.active && (permanent || r.unbandate > now)) return 'Revocada'
  return 'Expirada'
}

function responsibleOf(reason: string, bannedBy: string) {
  const m = reason?.match(/^\[GM ([^\]]+)\]\s*(.*)$/)
  return m ? { gm: m[1], reason: m[2] } : { gm: bannedBy || 'Desconocido', reason }
}

function durationLabel(seconds: number | null) {
  if (seconds == null) return 'Permanente'
  if (seconds <= 0) return '—'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h`
  return `${Math.round(h / 24)} días`
}

/** Sanction history straight from AzerothCore tables (nothing is invented). */
export async function getSanctionHistory(accountId: number, characters: Array<{ guid: number; name: string }>) {
  const out: Array<{
    id: string; type: string; target: string; reason: string; start: string; end: string | null
    duration: string; gm: string; status: string; source: string; revokedBy?: string | null
  }> = []

  const accountBans = await queryAuth<BanRow>(
    'SELECT bandate, unbandate, bannedby, banreason, active FROM account_banned WHERE id = ? ORDER BY bandate DESC', [accountId]
  ).catch(() => [])
  for (const b of accountBans) {
    const who = responsibleOf(b.banreason, b.bannedby)
    const permanent = b.unbandate === b.bandate
    out.push({
      id: `acc-${b.bandate}`, type: 'Ban de cuenta', target: 'Cuenta', reason: who.reason, gm: who.gm,
      start: new Date(b.bandate * 1000).toISOString(), end: permanent ? null : new Date(b.unbandate * 1000).toISOString(),
      duration: durationLabel(permanent ? null : b.unbandate - b.bandate), status: sanctionStatus(b), source: 'acore_auth.account_banned',
    })
  }

  if (characters.length) {
    const byGuid = new Map(characters.map(c => [c.guid, c.name]))
    const charBans = await queryCharacters<BanRow & { guid: number }>(
      `SELECT guid, bandate, unbandate, bannedby, banreason, active FROM character_banned WHERE guid IN (${characters.map(() => '?').join(',')}) ORDER BY bandate DESC`,
      characters.map(c => c.guid)
    ).catch(() => [])
    for (const b of charBans) {
      const who = responsibleOf(b.banreason, b.bannedby)
      const permanent = b.unbandate === b.bandate
      out.push({
        id: `chr-${b.guid}-${b.bandate}`, type: 'Ban de personaje', target: byGuid.get(b.guid) ?? `GUID ${b.guid}`, reason: who.reason, gm: who.gm,
        start: new Date(b.bandate * 1000).toISOString(), end: permanent ? null : new Date(b.unbandate * 1000).toISOString(),
        duration: durationLabel(permanent ? null : b.unbandate - b.bandate), status: sanctionStatus(b), source: 'acore_characters.character_banned',
      })
    }
  }

  const mutes = await queryAuth<{ mutedate: number; mutetime: number; mutedby: string; mutereason: string }>(
    'SELECT mutedate, mutetime, mutedby, mutereason FROM account_muted WHERE guid = ? ORDER BY mutedate DESC', [accountId]
  ).catch(() => [])
  for (const m of mutes) {
    const who = responsibleOf(m.mutereason, m.mutedby)
    const end = m.mutedate + m.mutetime * 60
    out.push({
      id: `mute-${m.mutedate}`, type: 'Silencio', target: 'Cuenta', reason: who.reason, gm: who.gm,
      start: new Date(m.mutedate * 1000).toISOString(), end: new Date(end * 1000).toISOString(),
      duration: durationLabel(m.mutetime * 60), status: end > Date.now() / 1000 ? 'Activa' : 'Expirada', source: 'acore_auth.account_muted',
    })
  }

  // Revocations made from the panel (who lifted it)
  const revoked = await queryCms<{ type: string; starts_at: Date; revoked_by_name: string | null }>(
    "SELECT type, starts_at, revoked_by_name FROM cms_gm_sanctions WHERE account_id = ? AND status = 'revocada'", [accountId]
  ).catch(() => [])
  for (const s of out) {
    const match = revoked.find(r => Math.abs(new Date(r.starts_at).getTime() - new Date(s.start).getTime()) < 120_000
      && ((r.type === 'ban_account' && s.type === 'Ban de cuenta') || (r.type === 'ban_character' && s.type === 'Ban de personaje')))
    if (match) s.revokedBy = match.revoked_by_name
  }

  return out.sort((a, b) => b.start.localeCompare(a.start))
}

export async function getAccountTickets(accountId: number) {
  return queryCms<{
    id: number; subject: string; category: string; status: string; priority: string; created_at: Date
    assigned_name: string | null; replies: number; last_reply_at: Date | null
  }>(
    `SELECT t.id, t.subject, t.category, t.status, t.priority, t.created_at, t.last_reply_at,
            ga.username AS assigned_name,
            (SELECT COUNT(*) FROM cms_ticket_replies r WHERE r.ticket_id = t.id) AS replies
     FROM cms_tickets t
     LEFT JOIN ${AUTH_DB}.account ga ON ga.id = t.assigned_to
     WHERE t.account_id = ? ORDER BY t.created_at DESC`,
    [accountId]
  ).catch(() => [])
}

export async function getAccountDetail(accountId: number, tier: GmTier) {
  const acc = await queryAuthFirst<Record<string, unknown>>('SELECT * FROM account WHERE id = ?', [accountId])
  if (!acc) return null

  const access = await getAccountAccess(accountId)
  const characters = await getAccountCharacters(accountId)
  const [sanctions, tickets, logIp] = await Promise.all([
    getSanctionHistory(accountId, characters),
    getAccountTickets(accountId),
    queryCms<{ ip: string }>(
      "SELECT ip FROM cms_logs WHERE account_id = ? AND action IN ('LOGIN','REGISTRO') AND ip IS NOT NULL ORDER BY id DESC LIMIT 1", [accountId]
    ).then(r => r[0]?.ip ?? null).catch(() => null),
  ])

  const lastIp = (acc.last_ip as string | null) ?? null
  const bestIp = isPublicIp(logIp) ? logIp : lastIp
  const country = await lookupCountry(bestIp)
  const muteUntil = typeof acc.mutetime === 'number' && acc.mutetime > Date.now() / 1000 ? new Date((acc.mutetime as number) * 1000) : null

  return {
    id: accountId,
    username: acc.username as string,
    email: maskEmail((acc.email as string) || (acc.reg_mail as string) || null, tier),
    lastIp: maskIp(logIp ?? lastIp, tier),
    piiLevel: can(tier, 'viewPiiFull') ? 'completo' : can(tier, 'viewPiiMasked') ? 'restringido' : 'oculto',
    country: country ? { code: country.code, name: country.name } : null,
    joindate: acc.joindate,
    lastLogin: acc.last_login ?? null,
    online: Number(acc.online ?? 0) > 0,
    locked: Number(acc.locked ?? 0) === 1,
    expansion: acc.expansion ?? null,
    muteUntil,
    gmlevel: access.gmlevel,
    gmTier: tierOfAccess(access),
    protected: !!access.directivo,
    characters,
    sanctions,
    activeSanctions: sanctions.filter(s => s.status === 'Activa').length,
    banned: sanctions.some(s => s.type === 'Ban de cuenta' && s.status === 'Activa'),
    tickets,
  }
}
