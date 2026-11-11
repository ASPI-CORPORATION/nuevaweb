import { NextResponse } from 'next/server'
import { getServerStatus } from '@/lib/gm/status.server'

/**
 * Public, minimal server status: real authserver TCP check and worldserver SOAP check
 * (cached 15 s server-side). No hosts, ports or versions are exposed.
 */
export async function GET() {
  const s = await getServerStatus().catch(() => null)
  return NextResponse.json(
    { auth: !!s?.authserver.online, world: !!s?.worldserver.online, checkedAt: s?.checkedAt ?? new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, max-age=15' } }
  )
}
