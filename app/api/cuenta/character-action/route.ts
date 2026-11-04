import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { queryCharactersFirst, queryCms } from '@/lib/db'
import { unstuckPlayer, revivePlayer, soapCommand } from '@/lib/soap'

const schema = z.object({
  characterName: z.string().min(1).max(50),
  action: z.enum(['unstuck', 'revive']),
})

export async function POST(req: NextRequest) {
  const result = await requireAuth(req)
  if (result instanceof Response) return result
  const user = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { characterName, action } = parsed.data

  try {
    // Verificar que el personaje pertenece al usuario
    const character = await queryCharactersFirst<{ guid: number; account: number }>(
      'SELECT guid, account FROM characters WHERE name = ? AND deleteinfos_account IS NULL',
      [characterName]
    )

    if (!character || character.account !== user.id) {
      return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })
    }

    let soapResult: { success: boolean; result: string }

    if (action === 'unstuck') {
      soapResult = await unstuckPlayer(characterName)
    } else {
      soapResult = await revivePlayer(characterName)
    }

    // Log
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details) VALUES (?, ?, ?)',
      [user.id, action.toUpperCase(), `${action} en ${characterName}`]
    )

    return NextResponse.json({
      success: soapResult.success,
      message: soapResult.success
        ? action === 'unstuck'
          ? `${characterName} fue teleportado a una capital.`
          : `${characterName} fue revivido.`
        : 'El personaje debe estar online para esta acción.',
    })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
