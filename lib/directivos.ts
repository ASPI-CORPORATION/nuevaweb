import { queryCms, queryAuthFirst, dbCms } from '@/lib/db'
import { requireRole, getSessionFromRequest, type AuthorizedUser } from '@/lib/auth'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'
import { isOwner } from '@/lib/roles'
import type { NextRequest } from 'next/server'
import type { PoolConnection } from 'mysql2/promise'

/**
 * DB-verified Directivo check for API routes: the account must have an active row in
 * wowargentina_cms.wowargentina_directivos. Denied attempts are written to cms_logs.
 */
export async function requireDirectivo(req: NextRequest): Promise<AuthorizedUser | Response> {
  const result = await requireRole(req, 'directivo')
  if (result instanceof Response && result.status === 403) {
    const session = getSessionFromRequest(req)
    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logUnauthorizedAttempt(session?.id ?? null, session?.username ?? 'anónimo', req.nextUrl.pathname, normalizedIp)
  }
  return result
}

/** Propietario-only operations (managing the Directivos team). */
export async function requireOwner(req: NextRequest): Promise<AuthorizedUser | Response> {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  if (!isOwner(result.access)) {
    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logUnauthorizedAttempt(result.id, result.username, `${req.nextUrl.pathname} (solo Propietario)`, normalizedIp)
    return new Response(JSON.stringify({ error: 'Solo el Propietario puede gestionar el equipo de Directivos.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return result
}

export async function logUnauthorizedAttempt(accountId: number | null, username: string, path: string, ip: string) {
  try {
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [accountId, 'INTENTO DE ACCESO NO AUTORIZADO', `Intento de acceso a ${path} - Usuario: ${username}`, ip]
    )
  } catch {}
}

interface ColumnInfo { Field: string; Type: string; Null: 'YES' | 'NO'; Default: string | null; Extra: string }

let logColumns: ColumnInfo[] | null = null

/** Production databases may have extra columns (e.g. directivo_name NOT NULL) not in database/cms.sql. */
async function getLogColumns(): Promise<ColumnInfo[]> {
  if (!logColumns) logColumns = await queryCms<ColumnInfo>('SHOW COLUMNS FROM cms_directivos_logs')
  return logColumns
}

async function usernameOf(accountId: number | null): Promise<string> {
  if (!accountId) return ''
  const row = await queryAuthFirst<{ username: string }>('SELECT username FROM account WHERE id = ?', [accountId]).catch(() => null)
  return row?.username ?? `#${accountId}`
}

function neutralValue(type: string): unknown {
  const t = type.toLowerCase()
  if (/int|decimal|float|double|bit|bool/.test(t)) return 0
  if (/datetime|timestamp/.test(t)) return new Date()
  if (t.startsWith('date')) return new Date().toISOString().slice(0, 10)
  if (t.startsWith('enum(')) return t.match(/^enum\('((?:[^']|'')*)'/)?.[1]?.replace(/''/g, "'") ?? ''
  return ''
}

export async function logDirectivoAction(
  directivoId: number,
  targetAccountId: number | null,
  action: string,
  details: string,
  ip: string,
  /** Optional transaction connection, so the log commits together with the action. */
  conn?: Pick<PoolConnection, 'execute'>
) {
  const values: Record<string, unknown> = {
    directivo_account_id: directivoId,
    target_account_id: targetAccountId,
    action,
    details,
    ip,
  }
  const cols = await getLogColumns()
  const names = new Set(cols.map(c => c.Field))
  if (names.has('directivo_name')) values.directivo_name = await usernameOf(directivoId)
  if (names.has('target_name')) values.target_name = await usernameOf(targetAccountId)
  for (const c of cols) {
    const required = c.Null === 'NO' && c.Default === null && !/auto_increment|DEFAULT_GENERATED/i.test(c.Extra)
    if (required && !(c.Field in values)) values[c.Field] = neutralValue(c.Type)
  }
  const fields = Object.keys(values).filter(f => names.has(f))
  await (conn ?? dbCms).execute(
    `INSERT INTO cms_directivos_logs (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    fields.map(f => values[f]) as never
  )
}
