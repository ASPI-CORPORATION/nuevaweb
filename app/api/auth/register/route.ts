import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { queryAuth, queryAuthFirst, queryCms } from '@/lib/db'
import { generateSRPCredentials } from '@/lib/srp6'
import { rateLimit } from '@/lib/rate-limit'
import { signToken, createSessionCookie } from '@/lib/auth'

const schema = z.object({
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(16, 'Máximo 16 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo letras y números, sin espacios'),
  password: z.string()
    .min(6, 'Mínimo 6 caracteres')
    .max(16, 'Máximo 16 caracteres'),
  email: z.string().email('Email inválido').max(100),
  terms: z.literal(true),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'

  // Rate limit: 5 registros por IP cada 10 minutos
  const rl = rateLimit(`register:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un rato.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { username, password, email } = parsed.data

  try {
    // Verificar si username ya existe (case insensitive)
    const existingUser = await queryAuthFirst<{ id: number }>(
      'SELECT id FROM account WHERE UPPER(username) = UPPER(?)',
      [username]
    )
    if (existingUser) {
      return NextResponse.json({ error: 'Ese nombre de cuenta ya está en uso' }, { status: 400 })
    }

    // Verificar email único
    const existingEmail = await queryAuthFirst<{ id: number }>(
      'SELECT id FROM account WHERE email = ?',
      [email]
    )
    if (existingEmail) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 })
    }

    // Generar credenciales SRP6
    const { saltBuffer, verifierBuffer, shaPassHash } = generateSRPCredentials(username, password)

    // Insertar cuenta en acore_auth
    // AzerothCore master 2026 usa columnas: id, username, salt, verifier, sha_pass_hash, email, reg_mail
    const [result] = await queryAuth<{ insertId: number }>(
      `INSERT INTO account (username, salt, verifier, sha_pass_hash, email, reg_mail, joindate, last_ip, locked, online, expansion)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 0, 0, 2)`,
      [
        username.toUpperCase(),
        saltBuffer,
        verifierBuffer,
        shaPassHash,
        email,
        email,
        ip,
      ]
    ) as unknown as [{ insertId: number }, unknown]

    const accountId = (result as unknown as { insertId: number }).insertId

    // Crear fila de Moneda Argentina
    await queryCms(
      'INSERT IGNORE INTO cms_user_coins (account_id, coins) VALUES (?, 0)',
      [accountId]
    )

    // Log de registro
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [accountId, 'REGISTRO', `Nueva cuenta: ${username}`, ip]
    )

    // Auto-login
    const token = signToken({ id: accountId, username: username.toUpperCase(), email, gmlevel: 0, expansion: 2 })

    const response = NextResponse.json({ success: true, message: '¡Cuenta creada! Bienvenido a WoW Argentina.' })
    response.headers.set('Set-Cookie', createSessionCookie(token))
    return response

  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
