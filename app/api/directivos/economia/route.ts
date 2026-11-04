import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { queryCms } from '@/lib/db'

const coinSchema = z.object({
  action: z.enum(['give_coins', 'take_coins', 'mass_give']),
  accountId: z.number().int().positive().optional(),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(200),
})

const promoSchema = z.object({
  action: z.literal('create_promo'),
  code: z.string().min(3).max(20).regex(/^[A-Z0-9-]+$/, 'Solo mayúsculas, números y guiones'),
  coins: z.number().int().positive(),
  max_uses: z.number().int().default(1),
  expires_at: z.string().optional(),
  reason: z.string().min(1).max(200),
})

export async function GET(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result

  const [promos, recentOrders, richest] = await Promise.all([
    queryCms('SELECT * FROM cms_promo_codes ORDER BY created_at DESC LIMIT 20').catch(() => []),
    queryCms<{ id: number; account_id: number; item_name: string; price: number; status: string; created_at: string }>(
      'SELECT o.id, o.account_id, o.item_name, o.price, o.status, o.created_at, a.username FROM cms_orders o LEFT JOIN acore_auth.account a ON o.account_id = a.id ORDER BY o.created_at DESC LIMIT 20'
    ).catch(() => []),
    queryCms<{ account_id: number; coins: number; username: string }>(
      'SELECT c.account_id, c.coins, a.username FROM cms_user_coins c LEFT JOIN acore_auth.account a ON c.account_id = a.id ORDER BY c.coins DESC LIMIT 10'
    ).catch(() => []),
  ])

  return NextResponse.json({ promos, recentOrders, richest })
}

export async function POST(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  const directivo = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Try promo creation
  const promoParsed = promoSchema.safeParse(body)
  if (promoParsed.success) {
    const d = promoParsed.data
    await queryCms(
      'INSERT INTO cms_promo_codes (code, coins, max_uses, expires_at) VALUES (?, ?, ?, ?)',
      [d.code, d.coins, d.max_uses, d.expires_at || null]
    )
    await logDirectivoAction(directivo.id, null, 'CREATE_PROMO', `Código promo ${d.code} creado (${d.coins} monedas x${d.max_uses}). ${d.reason}`, ip)
    return NextResponse.json({ success: true })
  }

  // Try coins action
  const coinParsed = coinSchema.safeParse(body)
  if (!coinParsed.success) return NextResponse.json({ error: coinParsed.error.issues[0].message }, { status: 400 })

  const d = coinParsed.data

  if (d.action === 'mass_give') {
    await queryCms('UPDATE cms_user_coins SET coins = coins + ?', [d.amount])
    await logDirectivoAction(directivo.id, null, 'MASS_GIVE_COINS', `Repartió ${d.amount} monedas a TODOS los jugadores. Motivo: ${d.reason}`, ip)
    return NextResponse.json({ success: true })
  }

  if (!d.accountId) return NextResponse.json({ error: 'accountId requerido' }, { status: 400 })

  if (d.action === 'give_coins') {
    await queryCms(
      'INSERT INTO cms_user_coins (account_id, coins) VALUES (?, ?) ON DUPLICATE KEY UPDATE coins = coins + ?',
      [d.accountId, d.amount, d.amount]
    )
    await logDirectivoAction(directivo.id, d.accountId, 'GIVE_COINS', `Dio ${d.amount} monedas a cuenta #${d.accountId}. Motivo: ${d.reason}`, ip)
  } else if (d.action === 'take_coins') {
    await queryCms(
      'UPDATE cms_user_coins SET coins = GREATEST(0, coins - ?) WHERE account_id = ?',
      [d.amount, d.accountId]
    )
    await logDirectivoAction(directivo.id, d.accountId, 'TAKE_COINS', `Quitó ${d.amount} monedas de cuenta #${d.accountId}. Motivo: ${d.reason}`, ip)
  }

  return NextResponse.json({ success: true })
}
