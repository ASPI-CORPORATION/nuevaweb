import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { queryAuthFirst, queryAuth, queryCms } from '@/lib/db'
import { verifyPassword, generateSRPCredentials } from '@/lib/srp6'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(16),
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

  const { currentPassword, newPassword } = parsed.data

  try {
    const account = await queryAuthFirst<{ username: string; salt: Buffer; verifier: Buffer }>(
      'SELECT username, salt, verifier FROM account WHERE id = ?',
      [user.id]
    )

    if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

    const saltBuf = Buffer.isBuffer(account.salt) ? account.salt : Buffer.from(account.salt)
    const verifierBuf = Buffer.isBuffer(account.verifier) ? account.verifier : Buffer.from(account.verifier)

    // Verificar contraseña actual via SRP6
    if (!verifyPassword(account.username, currentPassword, saltBuf, verifierBuf)) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
    }

    // Generar nuevas credenciales SRP6
    const { saltBuffer, verifierBuffer } = generateSRPCredentials(account.username, newPassword)

    // Actualizar solo salt y verifier (no existe sha_pass_hash en master 2026)
    await queryAuth(
      'UPDATE account SET salt = ?, verifier = ? WHERE id = ?',
      [saltBuffer, verifierBuffer, user.id]
    )

    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details) VALUES (?, ?, ?)',
      [user.id, 'PASSWORD_CHANGE', 'Contraseña actualizada desde web']
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
