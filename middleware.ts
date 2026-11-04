import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const user = getUserFromRequest(req)

  // Rutas protegidas
  if (pathname.startsWith('/cuenta')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), req.url))
    }
  }

  if (pathname.startsWith('/gm')) {
    if (!user || user.gmlevel < 2) {
      const url = new URL('/', req.url)
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!user || user.gmlevel < 3) {
      const url = new URL('/', req.url)
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/directivos')) {
    if (!user || user.gmlevel < 10) {
      // Log intento de acceso no autorizado (lo hacemos en la API)
      const url = new URL('/api/security/log-attempt', req.url)
      // Redirigir a home
      const response = NextResponse.redirect(new URL('/', req.url))
      // Pasar info del intento via header interno
      response.headers.set('x-unauthorized-attempt', pathname)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/cuenta/:path*', '/gm/:path*', '/admin/:path*', '/directivos/:path*'],
}
