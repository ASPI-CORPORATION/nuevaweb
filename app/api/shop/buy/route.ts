import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { queryCms, queryCmsFirst, queryCharactersFirst } from '@/lib/db'
import { sendMailInGame } from '@/lib/soap'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  itemId: z.number().positive(),
  characterName: z.string().min(1).max(50),
})

export async function POST(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  const rl = rateLimit(`shop:${user.id}`, 10, 60 * 1000)
  if (!rl.success) return NextResponse.json({ error: 'Demasiadas compras. Esperá un momento.' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { itemId, characterName } = parsed.data

  try {
    // Obtener item
    const item = await queryCmsFirst<{
      id: number; item_entry: number; name: string; price_coins: number; stock: number; active: number
    }>(
      'SELECT id, item_entry, name, price_coins, stock, active FROM cms_shop_items WHERE id = ?',
      [itemId]
    )

    if (!item || !item.active) {
      return NextResponse.json({ error: 'Item no disponible' }, { status: 404 })
    }

    if (item.stock === 0) {
      return NextResponse.json({ error: 'Sin stock' }, { status: 400 })
    }

    // Verificar personaje existe y pertenece al usuario
    const character = await queryCharactersFirst<{ guid: number; name: string; account: number }>(
      'SELECT guid, name, account FROM characters WHERE name = ?',
      [characterName]
    )

    if (!character) {
      return NextResponse.json({ error: 'Personaje no encontrado. Verificá el nombre.' }, { status: 400 })
    }

    if (character.account !== user.id) {
      return NextResponse.json({ error: 'Ese personaje no pertenece a tu cuenta.' }, { status: 403 })
    }

    // Verificar saldo
    const coinsRow = await queryCmsFirst<{ coins: number }>(
      'SELECT coins FROM cms_user_coins WHERE account_id = ?',
      [user.id]
    )
    const userCoins = coinsRow?.coins ?? 0

    if (userCoins < item.price_coins) {
      return NextResponse.json({ error: 'No tenés suficiente Moneda Argentina.' }, { status: 400 })
    }

    // Descontar monedas
    await queryCms(
      'UPDATE cms_user_coins SET coins = coins - ? WHERE account_id = ? AND coins >= ?',
      [item.price_coins, user.id, item.price_coins]
    )

    // Crear orden como Pendiente
    const [orderResult] = await queryCms(
      `INSERT INTO cms_orders (account_id, character_name, item_entry, item_name, price, status)
       VALUES (?, ?, ?, ?, ?, 'Pendiente')`,
      [user.id, characterName, item.item_entry, item.name, item.price_coins]
    ) as unknown as [{ insertId: number }]

    // Enviar item vía SOAP
    const soapResult = await sendMailInGame(
      characterName,
      `Compra en Tienda WoW Argentina`,
      `Hola ${characterName}! Gracias por tu compra de ${item.name}. ¡Que lo disfrutes!`,
      item.item_entry,
      1
    )

    const orderId = (orderResult as unknown as { insertId: number }).insertId
    const status = soapResult.success ? 'Entregado' : 'Pendiente'

    // Actualizar estado de la orden
    await queryCms(
      'UPDATE cms_orders SET status = ?, soap_response = ? WHERE id = ?',
      [status, soapResult.result, orderId]
    )

    // Actualizar stock si no es ilimitado
    if (item.stock > 0) {
      await queryCms(
        'UPDATE cms_shop_items SET stock = stock - 1 WHERE id = ? AND stock > 0',
        [item.id]
      )
    }

    // Log
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [user.id, 'SHOP_BUY', `Compra: ${item.name} (${item.item_entry}) para ${characterName} - ${item.price_coins} MA`, req.headers.get('x-forwarded-for') ?? 'unknown']
    )

    return NextResponse.json({
      success: true,
      message: soapResult.success
        ? `¡Compra exitosa! ${item.name} enviado por correo a ${characterName}.`
        : `Compra registrada. El item será entregado pronto a ${characterName}.`,
      orderId,
    })

  } catch (err) {
    console.error('Shop buy error:', err)
    return NextResponse.json({ error: 'Error interno al procesar la compra' }, { status: 500 })
  }
}
