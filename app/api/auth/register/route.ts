import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { queryAuthFirst, executeAuth, executeCms } from '@/lib/db'
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
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { username, password, email } = parsed.data
  const usernameUpper = username.toUpperCase()

  try {
    // Username único (case insensitive)
    const existingUser = await queryAuthFirst<{ id: number }>(
      'SELECT id FROM account WHERE UPPER(username) = UPPER(?)',
      [username],
    )
    if (existingUser) {
      return NextResponse.json({ error: 'Ese nombre de cuenta ya está en uso' }, { status: 400 })
    }

    // Email único
    const existingEmail = await queryAuthFirst<{ id: number }>(
      'SELECT id FROM account WHERE email = ?',
      [email],
    )
    if (existingEmail) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 })
    }

    // Generar credenciales SRP6 (salt + verifier, 32 bytes c/u, little-endian)
    // No se loguean ni exponen — solo se insertan en DB como BINARY(32)
    const { saltBuffer, verifierBuffer } = generateSRPCredentials(usernameUpper, password)

    console.log(`[register] inserting account username="${usernameUpper}" ip=${ip}`)

    // Insertar en acore_auth.account — sin sha_pass_hash (columna inexistente en master 2026)
    // executeAuth devuelve ResultSetHeader directamente; NO usar queryAuth() para INSERT
    // porque queryAuth ya extrae la primera posición del tuple de mysql2 y devuelve un
    // objeto plano (no iterable), lo que causaba: TypeError: (intermediate value) is not iterable
    const insertResult = await executeAuth(
      `INSERT INTO account (username, salt, verifier, email, reg_mail, joindate, last_ip, locked, online, expansion)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, 0, 0, 2)`,
      [usernameUpper, saltBuffer, verifierBuffer, email, email, ip],
    )

    const accountId = insertResult.insertId
    if (!accountId) {
      console.error(`[register] INSERT did not return insertId for username="${usernameUpper}"`)
      return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
    }

    console.log(`[register] account created id=${accountId} username="${usernameUpper}"`)

    // Crear fila de monedas en CMS (IGNORE si ya existe por alguna razón)
    await executeCms(
      'INSERT IGNORE INTO cms_user_coins (account_id, coins) VALUES (?, 0)',
      [accountId],
    )

    // Log de registro (sin contraseñas ni credenciales)
    await executeCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [accountId, 'REGISTRO', `Nueva cuenta: ${usernameUpper}`, ip],
    )

    // Auto-login
    const token = signToken({ id: accountId, username: usernameUpper, email, gmlevel: 0, expansion: 2 })

    const response = NextResponse.json({ success: true, message: '¡Cuenta creada! Bienvenido a WoW Argentina.' })
    response.headers.set('Set-Cookie', createSessionCookie(token))
    return response

  } catch (err) {
    // Log de error sin exponer contraseñas ni credenciales
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[register] error username="${username}" op=register msg="${msg}"`)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
