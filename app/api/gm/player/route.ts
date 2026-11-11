import { NextRequest, NextResponse } from 'next/server'
import { requireDirectivo } from '@/lib/directivos'
import { queryAuthFirst, queryAuth, queryCharacters } from '@/lib/db'

export async function GET(req: NextRequest) {
  // Only consumer: /directivos/cuentas. GM tooling uses /api/gm/accounts with tier checks and PII masking.
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const q = req.nextUrl.searchParams.get('q') || ''
  if (!q.trim()) return NextResponse.json({ error: 'Búsqueda requerida' }, { status: 400 })

  try {
    // Buscar por cuenta primero
    let account = await queryAuthFirst<{
      id: number; username: string; email: string; last_ip: string; online: number; expansion: number; joindate: string
    }>(
      'SELECT id, username, email, last_ip, online, expansion, joindate FROM account WHERE UPPER(username) = UPPER(?)',
      [q]
    )

    if (!account) {
      // Buscar por personaje
      const { queryCharactersFirst } = await import('@/lib/db')
      const char = await queryCharactersFirst<{ account: number }>(
        'SELECT account FROM characters WHERE name = ?',
        [q]
      )
      if (char) {
        account = await queryAuthFirst<{
          id: number; username: string; email: string; last_ip: string; online: number; expansion: number; joindate: string
        }>(
          'SELECT id, username, email, last_ip, online, expansion, joindate FROM account WHERE id = ?',
          [char.account]
        )
      }
    }

    if (!account) return NextResponse.json(null, { status: 404 })

    const [accessRow] = await queryAuth<{ gmlevel: number }>(
      'SELECT gmlevel FROM account_access WHERE id = ? AND (RealmID = -1 OR RealmID = 1) ORDER BY gmlevel DESC LIMIT 1',
      [account.id]
    )

    const [banRow] = await queryAuth<{ active: number }>(
      'SELECT active FROM account_banned WHERE id = ? AND active = 1',
      [account.id]
    )

    const characters = await queryCharacters<{ guid: number; name: string; level: number; class: number; online: number }>(
      'SELECT guid, name, level, class, online FROM characters WHERE account = ? AND deleteinfos_account IS NULL',
      [account.id]
    )

    return NextResponse.json({
      account,
      gmlevel: accessRow?.gmlevel ?? 0,
      banned: !!banRow,
      characters,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
