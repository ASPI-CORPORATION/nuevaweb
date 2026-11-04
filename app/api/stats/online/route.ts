import { NextResponse } from 'next/server'
import { queryAuth } from '@/lib/db'


export async function GET() {
  try {
    const [row] = await queryAuth<{ count: number }>(
      'SELECT COUNT(*) as count FROM account WHERE online = 1'
    )
    return NextResponse.json({ count: row?.count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
