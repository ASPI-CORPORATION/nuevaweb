import { queryCms } from '@/lib/db'
import { requireRole, getSessionFromRequest, type AuthorizedUser } from '@/lib/auth'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'
import { isOwner } from '@/lib/roles'
import type { NextRequest } from 'next/server'

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
