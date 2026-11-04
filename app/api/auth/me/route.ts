import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, getFullGmLevel } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ user: null })
  }
  // Revalidar gmlevel desde DB
  const gmlevel = await getFullGmLevel(session.id)
  return NextResponse.json({ user: { ...session, gmlevel } })
}
