import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function getUserFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get('wow_session')?.value
    if (!token) return null
    return jwt.verify(token, JWT_SECRET) as { id: number; gmlevel: number }
  } catch {
    return null
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const user = getUserFromRequest(req)

  if (pathname.startsWith('/cuenta')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), req.url))
    }
  }

  if (pathname.startsWith('/gm')) {
    if (!user || user.gmlevel < 2) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!user || user.gmlevel < 3) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  if (pathname.startsWith('/directivos')) {
    if (!user || user.gmlevel < 10) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/cuenta/:path*', '/gm/:path*', '/admin/:path*', '/directivos/:path*'],
}
