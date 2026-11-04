import { NextRequest, NextResponse } from 'next/server'
import { requireDirectivo } from '@/lib/directivos'
import { queryCms } from '@/lib/db'

export async function GET(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const type = req.nextUrl.searchParams.get('type') || 'directivos'
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const q = req.nextUrl.searchParams.get('q') || ''
  const limit = 50
  const offset = (page - 1) * limit

  let logs: unknown[] = []
  let total = 0

  if (type === 'directivos') {
    logs = await queryCms(
      `SELECT l.id, l.directivo_account_id, l.target_account_id, l.action, l.details, l.ip, l.created_at,
              a.username as directivo_name, t.username as target_name
       FROM cms_directivos_logs l
       LEFT JOIN acore_auth.account a ON l.directivo_account_id = a.id
       LEFT JOIN acore_auth.account t ON l.target_account_id = t.id
       ${q ? 'WHERE l.action LIKE ? OR l.details LIKE ?' : ''}
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]
    ).catch(() => [])
    const [{ c }] = await queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_directivos_logs').catch(() => [{ c: 0 }])
    total = c
  } else if (type === 'gm') {
    logs = await queryCms(
      `SELECT l.id, l.gm_account_id, l.target_account_id, l.action, l.details, l.ip, l.created_at,
              a.username as gm_name
       FROM cms_gm_logs l
       LEFT JOIN acore_auth.account a ON l.gm_account_id = a.id
       ${q ? 'WHERE l.action LIKE ? OR l.details LIKE ?' : ''}
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]
    ).catch(() => [])
    const [{ c }] = await queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_gm_logs').catch(() => [{ c: 0 }])
    total = c
  } else {
    logs = await queryCms(
      `SELECT l.id, l.account_id, l.action, l.details, l.ip, l.created_at,
              a.username
       FROM cms_logs l
       LEFT JOIN acore_auth.account a ON l.account_id = a.id
       ${q ? 'WHERE l.action LIKE ? OR l.details LIKE ?' : ''}
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]
    ).catch(() => [])
    const [{ c }] = await queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_logs').catch(() => [{ c: 0 }])
    total = c
  }

  return NextResponse.json({ logs, total })
}
