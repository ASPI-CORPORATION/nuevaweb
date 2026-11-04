import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel, getFullGmLevel } from '@/lib/auth'
import { queryAuth, queryAuthFirst, queryCms } from '@/lib/db'

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  const q = req.nextUrl.searchParams.get('q') || ''
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  let accounts
  if (q) {
    accounts = await queryAuth<{ id: number; username: string; email: string; last_ip: string; online: number; joindate: string }>(
      'SELECT id, username, email, last_ip, online, joindate FROM account WHERE username LIKE ? OR email LIKE ? LIMIT ? OFFSET ?',
      [`%${q}%`, `%${q}%`, limit, offset]
    )
  } else {
    accounts = await queryAuth<{ id: number; username: string; email: string; last_ip: string; online: number; joindate: string }>(
      'SELECT id, username, email, last_ip, online, joindate FROM account ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )
  }

  const [{ total }] = await queryAuth<{ total: number }>('SELECT COUNT(*) as total FROM account')

  const accountsWithGm = await Promise.all(
    accounts.map(async (a) => {
      const gmlevel = await getFullGmLevel(a.id)
      return { ...a, gmlevel }
    })
  )

  return NextResponse.json({ accounts: accountsWithGm, total })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireGmLevel(req, 3)
  if (admin instanceof Response) return admin

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { accountId, action, gmlevel } = body as { accountId: number; action: string; gmlevel?: number }
  if (!accountId || !action) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const targetGm = await getFullGmLevel(accountId)
  const adminGm = await getFullGmLevel(admin.id)

  // Hierarchy enforcement: admin can't touch equal or higher level
  if (targetGm >= adminGm) {
    return NextResponse.json({ error: 'No podés modificar a alguien de tu mismo nivel o superior' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  if (action === 'set_gmlevel') {
    if (gmlevel === undefined || gmlevel < 0 || gmlevel >= adminGm) {
      return NextResponse.json({ error: 'Nivel de GM inválido' }, { status: 400 })
    }
    if (gmlevel === 0) {
      await queryAuth('DELETE FROM account_access WHERE id = ?', [accountId])
    } else {
      await queryAuth(
        'INSERT INTO account_access (id, gmlevel, RealmID) VALUES (?, ?, -1) ON DUPLICATE KEY UPDATE gmlevel = ?',
        [accountId, gmlevel, gmlevel]
      )
    }
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [admin.id, 'SET_GMLEVEL', `Admin ${admin.username} cambió gmlevel de cuenta #${accountId} a ${gmlevel}`, ip]
    )
  }

  return NextResponse.json({ success: true })
}
