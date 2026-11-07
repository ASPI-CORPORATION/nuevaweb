import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function hasValidSession(req: NextRequest): boolean {
  const token = req.cookies.get('wow_session')?.value
  if (!token) return false
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

/**
 * Optimistic check only: protected areas require a valid session cookie.
 * Role authorization (GM / Admin / Directivo) is verified against the database
 * in each layout and API route — never from the role frozen inside the JWT,
 * which goes stale as soon as account_access or RBAC ranks change.
 */
export function proxy(req: NextRequest) {
  if (!hasValidSession(req)) {
    const { pathname, search } = req.nextUrl
    return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname + search), req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/cuenta/:path*', '/gm/:path*', '/admin/:path*', '/directivos/:path*'],
}
