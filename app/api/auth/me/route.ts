import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, getAccountAccess } from '@/lib/auth'
import { tierOfAccess } from '@/lib/gm/access.server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } })
  }
  // Role is always re-read from the database, never taken from the JWT
  const access = await getAccountAccess(session.id)
  return NextResponse.json(
    {
      user: {
        id: session.id,
        username: session.username,
        gmlevel: access.gmlevel,
        role: access.role,
        rbacRankId: access.rbacRankId,
        directivoRank: access.directivo?.rank ?? null,
        gmTier: tierOfAccess(access),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
