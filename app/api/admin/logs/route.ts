import { NextRequest, NextResponse } from 'next/server'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  const type = req.nextUrl.searchParams.get('type') || 'all'
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const q = req.nextUrl.searchParams.get('q') || ''
  const limit = 50
  const offset = (page - 1) * limit

  let logs: unknown[] = []
  let total = 0

  if (type === 'all' || type === 'general') {
    const rows = await queryCms<{ id: number; account_id: number; action: string; details: string; ip: string; created_at: string }>(
      `SELECT l.id, l.account_id, l.action, l.details, l.ip, l.created_at,
              a.username as username
       FROM cms_logs l
       LEFT JOIN acore_auth.account a ON l.account_id = a.id
       ${q ? 'WHERE l.action LIKE ? OR l.details LIKE ?' : ''}
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]
    )
    const [{ c }] = await queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_logs')
    logs = rows
    total = c
  } else if (type === 'gm') {
    const rows = await queryCms(
      `SELECT l.*, a.username as gm_name
       FROM cms_gm_logs l
       LEFT JOIN acore_auth.account a ON l.gm_account_id = a.id
       ${q ? 'WHERE l.action LIKE ? OR l.details LIKE ?' : ''}
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]
    )
    const [{ c }] = await queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_gm_logs')
    logs = rows
    total = c
  }

  return NextResponse.json({ logs, total })
}
