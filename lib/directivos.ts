import { queryCms } from '@/lib/db'
import { requireRole, getSessionFromRequest, type AuthorizedUser } from '@/lib/auth'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'
import type { NextRequest } from 'next/server'

/**
 * DB-verified Directivo check for API routes (gmlevel 10 legacy, RBAC Owner/Co-Owner,
 * or DIRECTIVOS_ACCOUNT_IDS). Denied attempts are written to cms_logs.
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

export async function logUnauthorizedAttempt(accountId: number | null, username: string, path: string, ip: string) {
  try {
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [accountId, 'INTENTO DE ACCESO NO AUTORIZADO', `Intento de acceso a ${path} - Usuario: ${username}`, ip]
    )
  } catch {}
}

export async function logDirectivoAction(
  directivoId: number,
  targetAccountId: number | null,
  action: string,
  details: string,
  ip: string
) {
  await queryCms(
    'INSERT INTO cms_directivos_logs (directivo_account_id, target_account_id, action, details, ip) VALUES (?, ?, ?, ?, ?)',
    [directivoId, targetAccountId, action, details, ip]
  )
}
