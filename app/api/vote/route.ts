import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { queryCms, queryCmsFirst } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sendMailInGame } from '@/lib/soap'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

const schema = z.object({
  site: z.enum(['TopG', 'WoW-Servers', 'Top100Arena']),
})

export async function POST(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  const ip = normalizeIP(getClientIP(req.headers)).normalizedIp
  const rl = rateLimit(`vote:${user.id}`, 5, 60 * 1000)
  if (!rl.success) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Sitio inválido' }, { status: 400 })

  const { site } = parsed.data

  try {
    // Check cooldown
    const cooldownConfig = await queryCmsFirst<{ value: string }>(
      'SELECT value FROM cms_config WHERE key_name = ?',
      ['vote_cooldown_hours']
    )
    const cooldownHours = parseInt(cooldownConfig?.value || '12')

    const lastVote = await queryCmsFirst<{ created_at: Date }>(
      'SELECT created_at FROM cms_votes WHERE account_id = ? AND site = ? ORDER BY created_at DESC LIMIT 1',
      [user.id, site]
    )

    if (lastVote) {
      const elapsed = (new Date().getTime() - new Date(lastVote.created_at).getTime()) / 3600000
      if (elapsed < cooldownHours) {
        const remaining = Math.ceil(cooldownHours - elapsed)
        return NextResponse.json(
          { error: `Todavía no podés votar. Esperá ${remaining} hora${remaining !== 1 ? 's' : ''} más.` },
          { status: 400 }
        )
      }
    }

    // Registrar voto
    await queryCms(
      'INSERT INTO cms_votes (account_id, site, ip, rewarded) VALUES (?, ?, ?, 0)',
      [user.id, site, ip]
    )

    // Dar moneda Argentina
    const coinsConfig = await queryCmsFirst<{ value: string }>(
      'SELECT value FROM cms_config WHERE key_name = ?',
      ['vote_coins_reward']
    )
    const coinsReward = parseInt(coinsConfig?.value || '1')

    await queryCms(
      'INSERT INTO cms_user_coins (account_id, coins) VALUES (?, ?) ON DUPLICATE KEY UPDATE coins = coins + ?',
      [user.id, coinsReward, coinsReward]
    )

    // Marcar como recompensado
    await queryCms(
      'UPDATE cms_votes SET rewarded = 1 WHERE account_id = ? AND site = ? ORDER BY created_at DESC LIMIT 1',
      [user.id, site]
    )

    // Log
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [user.id, 'VOTE', `Voto en ${site}: +${coinsReward} Moneda Argentina`, ip]
    )

    return NextResponse.json({
      success: true,
      message: `¡Gracias por votar! +${coinsReward} Moneda Argentina en tu cuenta.`,
      coinsRewarded: coinsReward,
    })

  } catch (err) {
    console.error('Vote error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
