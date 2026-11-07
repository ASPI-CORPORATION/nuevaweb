import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { queryAuth, queryAuthFirst } from '@/lib/db'
import { queryCms } from '@/lib/db'
import { banAccount, unbanAccount, banIP } from '@/lib/soap'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

const schema = z.object({
  action: z.enum(['ban_account', 'unban_account', 'ban_ip']),
  identifier: z.string().min(1),
  reason: z.string().min(1).max(500),
  duration: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  const directivo = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { action, identifier, reason, duration } = parsed.data
  const ip = normalizeIP(getClientIP(req.headers)).normalizedIp

  let targetId: number | null = null
  let soapResult = { success: false, result: '' }
  let message = ''

  if (action === 'ban_account') {
    const target = await queryAuthFirst<{ id: number }>('SELECT id FROM account WHERE UPPER(username) = UPPER(?)', [identifier])
    targetId = target?.id ?? null
    soapResult = await banAccount(identifier, duration || '0', reason, directivo.username)
    if (target) {
      await queryAuth(
        'INSERT INTO account_banned (id, bandate, unbandate, bannedby, banreason, active) VALUES (?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), ?, ?, 1) ON DUPLICATE KEY UPDATE active = 1, banreason = ?, bannedby = ?',
        [target.id, directivo.username, reason, reason, directivo.username]
      )
    }
    message = `Cuenta ${identifier} baneada permanentemente. Motivo: ${reason}`
  } else if (action === 'unban_account') {
    const target = await queryAuthFirst<{ id: number }>('SELECT id FROM account WHERE UPPER(username) = UPPER(?)', [identifier])
    targetId = target?.id ?? null
    soapResult = await unbanAccount(identifier)
    if (target) {
      await queryAuth('UPDATE account_banned SET active = 0 WHERE id = ?', [target.id])
    }
    message = `Cuenta ${identifier} desbaneada`
  } else if (action === 'ban_ip') {
    soapResult = await banIP(identifier, duration || '0', reason)
    message = `IP ${identifier} baneada. Motivo: ${reason}`
  }

  await logDirectivoAction(directivo.id, targetId, action.toUpperCase(), message, ip)

  return NextResponse.json({ success: true, message, soapOk: soapResult.success })
}

export async function GET(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const bans = await queryAuth<{ id: number; username: string; banreason: string; bannedby: string; bandate: number; active: number }>(
    `SELECT a.id, a.username, ab.banreason, ab.bannedby, ab.bandate, ab.active
     FROM account_banned ab
     JOIN account a ON a.id = ab.id
     WHERE ab.active = 1
     ORDER BY ab.bandate DESC LIMIT 100`
  )

  return NextResponse.json({ bans })
}
