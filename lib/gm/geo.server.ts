import { open, type Reader, type CountryResponse } from 'maxmind'
import { existsSync } from 'node:fs'
import { AUTH_DB, queryCms, executeCms } from '@/lib/db'

/**
 * Approximate country from a MaxMind GeoLite2/GeoIP2 Country or City database.
 * Configure GEOIP_DB_PATH=/path/GeoLite2-Country.mmdb. Without it every account is
 * "País desconocido": locations are never guessed.
 *
 * IP source per account (best first):
 *   1. latest LOGIN/REGISTRO in wowargentina_cms.cms_logs (stores full IPv6)
 *   2. acore_auth.account.last_ip (VARCHAR(15) in AzerothCore: IPv4 only)
 */

let readerPromise: Promise<Reader<CountryResponse> | null> | null = null
let lastFailure = 0

export function geoConfigured(): boolean {
  const p = process.env.GEOIP_DB_PATH
  return !!p && existsSync(p)
}

async function getReader(): Promise<Reader<CountryResponse> | null> {
  if (!geoConfigured()) return null
  if (!readerPromise && Date.now() - lastFailure > 5 * 60_000) {
    readerPromise = open<CountryResponse>(process.env.GEOIP_DB_PATH as string).catch(err => {
      console.error('[geoip] cannot open database:', err instanceof Error ? err.message : err)
      lastFailure = Date.now()
      readerPromise = null
      return null
    })
  }
  return readerPromise ?? null
}

export function isPublicIp(ip: string | null | undefined): ip is string {
  if (!ip) return false
  const v = ip.trim().toLowerCase()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
    const [a, b] = v.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    return true
  }
  if (v.includes(':')) {
    if (v === '::1' || v === '::') return false
    if (/^f[cd]/.test(v) || /^fe[89ab]/.test(v)) return false
    if (v.startsWith('::ffff:')) return isPublicIp(v.slice(7))
    return true
  }
  return false
}

export async function lookupCountry(ip: string | null | undefined): Promise<{ code: string; name: string } | null> {
  if (!isPublicIp(ip)) return null
  const reader = await getReader()
  if (!reader) return null
  try {
    const r = reader.get(ip.startsWith('::ffff:') ? ip.slice(7) : ip)
    const c = r?.country ?? r?.registered_country
    if (!c?.iso_code) return null
    return { code: c.iso_code, name: c.names?.es ?? c.names?.en ?? c.iso_code }
  } catch {
    return null
  }
}

/**
 * Fills cms_account_geo for accounts that have no row yet (or whose row is older than a day).
 * Lookups are in-memory, so a batch of a few thousand accounts takes milliseconds.
 */
export async function syncAccountGeo(limit = 3000): Promise<{ processed: number; enabled: boolean }> {
  if (!geoConfigured()) return { processed: 0, enabled: false }
  const rows = await queryCms<{ id: number; last_ip: string | null; log_ip: string | null }>(
    `SELECT a.id, a.last_ip,
            (SELECT l.ip FROM cms_logs l
              WHERE l.account_id = a.id AND l.action IN ('LOGIN','REGISTRO') AND l.ip IS NOT NULL
              ORDER BY l.id DESC LIMIT 1) AS log_ip
     FROM ${AUTH_DB}.account a
     LEFT JOIN cms_account_geo g ON g.account_id = a.id
     WHERE g.account_id IS NULL OR g.updated_at < NOW() - INTERVAL 1 DAY
     LIMIT ?`,
    [limit]
  )
  for (const r of rows) {
    const ip = isPublicIp(r.log_ip) ? r.log_ip : isPublicIp(r.last_ip) ? r.last_ip : (r.log_ip ?? r.last_ip)
    const country = await lookupCountry(ip)
    await executeCms(
      `INSERT INTO cms_account_geo (account_id, ip, country_code, country_name) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ip = VALUES(ip), country_code = VALUES(country_code), country_name = VALUES(country_name), updated_at = NOW()`,
      [r.id, ip ?? null, country?.code ?? null, country?.name ?? null]
    )
  }
  return { processed: rows.length, enabled: true }
}
