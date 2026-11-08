import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { queryAuthFirst, queryCmsFirst } from './db'
import {
  type AccessInfo, type WebRole,
  type DirectivoMembership,
  hasRole, resolveRole, roleForMinGmLevel,
} from './roles'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const COOKIE_NAME = 'wow_session'

export interface SessionUser {
  id: number
  username: string
  email: string
  gmlevel: number
  expansion: number
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

const REALM_ID = Number(process.env.REALM_ID || 1)

export async function getFullGmLevel(accountId: number): Promise<number> {
  const access = await queryAuthFirst<{ gmlevel: number }>(
    'SELECT gmlevel FROM account_access WHERE id = ? AND (RealmID = -1 OR RealmID = ?) ORDER BY gmlevel DESC LIMIT 1',
    [accountId, REALM_ID]
  )
  return Number(access?.gmlevel ?? 0)
}

let rbacUnavailableLogged = false

/**
 * Highest custom RBAC rank (90000-90009) granted to the account, counting only
 * permissions that are actually registered in rbac_permissions.
 * Returns null when there is no rank or the RBAC tables do not exist on this server.
 */
export async function getVerifiedRbacRank(accountId: number): Promise<number | null> {
  try {
    const row = await queryAuthFirst<{ permission: number | null }>(
      `SELECT MAX(rap.permission) AS permission
       FROM rbac_account_permissions rap
       JOIN rbac_permissions rp ON rp.id = rap.permission
       WHERE rap.id = ? AND rap.permission BETWEEN 90000 AND 90009
         AND rap.granted = 1 AND rap.realm_id IN (-1, ?)`,
      [accountId, REALM_ID]
    )
    return row?.permission != null ? Number(row.permission) : null
  } catch (err) {
    if (!rbacUnavailableLogged) {
      rbacUnavailableLogged = true
      console.warn(`[auth] RBAC tables unavailable, using account_access only: ${err instanceof Error ? err.message : err}`)
    }
    return null
  }
}

let directivosTableMissingLogged = false

/**
 * Active membership in wowargentina_cms.wowargentina_directivos — the ONLY source of
 * access to /directivos. Returns null when the account is not an active member.
 */
export async function getDirectivoMembership(accountId: number): Promise<DirectivoMembership | null> {
  try {
    const row = await queryCmsFirst<{ rango: 'propietario' | 'directivo'; nombre_directivo: string }>(
      `SELECT rango, nombre_directivo FROM wowargentina_directivos
       WHERE account_id = ? AND activo = 1 AND fecha_baja IS NULL`,
      [accountId]
    )
    return row ? { rank: row.rango, name: row.nombre_directivo } : null
  } catch (err) {
    if (!directivosTableMissingLogged) {
      directivosTableMissingLogged = true
      console.error(`[auth] wowargentina_directivos unavailable — run migrations/2026_11_wowargentina_directivos.sql: ${err instanceof Error ? err.message : err}`)
    }
    return null
  }
}

export async function getAccountAccess(accountId: number): Promise<AccessInfo> {
  const [gmlevel, rbacRankId, directivo] = await Promise.all([
    getFullGmLevel(accountId).catch(() => 0),
    getVerifiedRbacRank(accountId),
    getDirectivoMembership(accountId),
  ])
  return resolveRole({ gmlevel, rbacRankId, directivo })
}

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
}

/**
 * CSRF defence in depth (the session cookie is already SameSite=Strict):
 * state-changing requests that carry an Origin header must come from this site.
 */
export function checkSameOrigin(req: NextRequest): Response | null {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return null
  const origin = req.headers.get('origin')
  if (!origin) return null
  const host = req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host')
  try {
    if (new URL(origin).host === host) return null
  } catch {}
  return jsonError('Origen no permitido', 403)
}

export type AuthorizedUser = SessionUser & { role: WebRole; access: AccessInfo }

/** For API routes: DB-verified role check. Returns the user or a 401/403 Response. */
export async function requireRole(req: NextRequest, min: WebRole): Promise<AuthorizedUser | Response> {
  const csrf = checkSameOrigin(req)
  if (csrf) return csrf
  const user = getSessionFromRequest(req)
  if (!user) return jsonError('No autenticado', 401)
  const access = await getAccountAccess(user.id)
  if (!hasRole(access.role, min)) return jsonError('No tenés autorización para realizar esta acción.', 403)
  return { ...user, gmlevel: access.gmlevel, role: access.role, access }
}

/** For server components / layouts. Returns null when not logged in. */
export async function getSessionWithAccess(): Promise<AuthorizedUser | null> {
  const session = await getSession()
  if (!session) return null
  const access = await getAccountAccess(session.id)
  return { ...session, gmlevel: access.gmlevel, role: access.role, access }
}

export async function requireAuth(req: NextRequest): Promise<SessionUser | Response> {
  const csrf = checkSameOrigin(req)
  if (csrf) return csrf
  const user = getSessionFromRequest(req)
  if (!user) return jsonError('No autenticado', 401)
  return user
}

/** Legacy numeric API (2 = GM, 3 = Admin, 10 = Directivo) mapped onto web roles. */
export async function requireGmLevel(req: NextRequest, minLevel: number): Promise<AuthorizedUser | Response> {
  return requireRole(req, roleForMinGmLevel(minLevel))
}

export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60 // 7 días
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}
