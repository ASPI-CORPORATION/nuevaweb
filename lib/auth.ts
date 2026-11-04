import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { queryAuth, queryAuthFirst } from './db'

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

export async function getFullGmLevel(accountId: number): Promise<number> {
  const access = await queryAuthFirst<{ gmlevel: number }>(
    'SELECT gmlevel FROM account_access WHERE id = ? AND (RealmID = -1 OR RealmID = 1) ORDER BY gmlevel DESC LIMIT 1',
    [accountId]
  )
  return access?.gmlevel ?? 0
}

export async function requireAuth(req: NextRequest): Promise<SessionUser | Response> {
  const user = getSessionFromRequest(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

export async function requireGmLevel(req: NextRequest, minLevel: number): Promise<SessionUser | Response> {
  const result = await requireAuth(req)
  if (result instanceof Response) return result

  const user = result as SessionUser
  const gmlevel = await getFullGmLevel(user.id)

  if (gmlevel < minLevel) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { ...user, gmlevel }
}

export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60 // 7 días
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}
