import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { queryCms } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { path } = await req.json().catch(() => ({ path: '/directivos' }))

    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [
        session?.id ?? 0,
        'INTENTO DE ACCESO NO AUTORIZADO',
        `Intento de acceso a ${path} - Usuario: ${session?.username ?? 'anónimo'} (gmlevel: ${session?.gmlevel ?? 0})`,
        ip,
      ]
    )
  } catch {}

  return NextResponse.json({ ok: true })
}
