import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryAuth, queryAuthFirst, queryCms } from '@/lib/db'
import { banAccount, unbanAccount, kickPlayer, revivePlayer, mutePlayer, unmutePlayer } from '@/lib/soap'

const schema = z.object({
  action: z.enum(['ban', 'unban', 'kick', 'revive', 'mute', 'unmute', 'give_coins']),
  accountName: z.string().optional(),
  characterName: z.string().optional(),
  reason: z.string().optional(),
  duration: z.string().optional(),
  minutes: z.number().optional(),
  amount: z.number().optional(),
  targetAccountId: z.number().optional(),
})

export async function POST(req: NextRequest) {
  const result = await requireGmLevel(req, 2)
  if (result instanceof Response) return result
  const gm = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const data = parsed.data
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  let soapResult: { success: boolean; result: string } = { success: true, result: '' }
  let message = ''
  let targetAccountId: number | null = null

  try {
    switch (data.action) {
      case 'ban': {
        if (!data.accountName || !data.reason) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        const target = await queryAuthFirst<{ id: number }>(
          'SELECT id FROM account WHERE UPPER(username) = UPPER(?)',
          [data.accountName]
        )
        targetAccountId = target?.id ?? null
        soapResult = await banAccount(data.accountName, data.duration || '0', data.reason, gm.username)
        message = soapResult.success ? `${data.accountName} baneado.` : `Baneo via SQL fallback.`
        // Fallback: insertar en account_banned directamente
        if (target) {
          const unbanDate = data.duration === '0' ? '0000-00-00 00:00:00' : new Date(Date.now() + 999999999).toISOString().slice(0, 19)
          await queryAuth(
            `INSERT IGNORE INTO account_banned (id, bandate, unbandate, bannedby, banreason, active)
             VALUES (?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP() + 0, ?, ?, 1)`,
            [target.id, gm.username, data.reason]
          )
        }
        message = `Cuenta ${data.accountName} baneada. Motivo: ${data.reason}`
        break
      }

      case 'unban': {
        if (!data.accountName) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        soapResult = await unbanAccount(data.accountName)
        const target = await queryAuthFirst<{ id: number }>(
          'SELECT id FROM account WHERE UPPER(username) = UPPER(?)',
          [data.accountName]
        )
        if (target) {
          await queryAuth('UPDATE account_banned SET active = 0 WHERE id = ?', [target.id])
          targetAccountId = target.id
        }
        message = `Cuenta ${data.accountName} desbaneada.`
        break
      }

      case 'kick': {
        if (!data.characterName) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        soapResult = await kickPlayer(data.characterName)
        message = `${data.characterName} kickeado del servidor.`
        break
      }

      case 'revive': {
        if (!data.characterName) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        soapResult = await revivePlayer(data.characterName)
        message = `${data.characterName} revivido.`
        break
      }

      case 'mute': {
        if (!data.characterName || !data.reason) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        soapResult = await mutePlayer(data.characterName, data.minutes || 60, data.reason)
        message = `${data.characterName} silenciado por ${data.minutes ?? 60} min.`
        break
      }

      case 'unmute': {
        if (!data.characterName) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        soapResult = await unmutePlayer(data.characterName)
        message = `${data.characterName} dessilenciado.`
        break
      }

      case 'give_coins': {
        if (!data.targetAccountId || !data.amount) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        await queryCms(
          'INSERT INTO cms_user_coins (account_id, coins) VALUES (?, ?) ON DUPLICATE KEY UPDATE coins = coins + ?',
          [data.targetAccountId, data.amount, data.amount]
        )
        targetAccountId = data.targetAccountId
        message = `+${data.amount} Moneda Argentina dado. Motivo: ${data.reason}`
        break
      }
    }

    // Log
    await queryCms(
      'INSERT INTO cms_gm_logs (gm_account_id, target_account_id, action, details, ip) VALUES (?, ?, ?, ?, ?)',
      [gm.id, targetAccountId, data.action.toUpperCase(), message, ip]
    )

    return NextResponse.json({ success: true, message })
  } catch (err) {
    console.error('GM action error:', err)
    return NextResponse.json({ error: 'Error al ejecutar la acción' }, { status: 500 })
  }
}
