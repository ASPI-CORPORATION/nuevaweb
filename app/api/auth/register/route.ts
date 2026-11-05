import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { queryAuthFirst, executeAuth, executeCms } from '@/lib/db'
import { generateSRPCredentials } from '@/lib/srp6'
import { rateLimit } from '@/lib/rate-limit'
import { signToken, createSessionCookie } from '@/lib/auth'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

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
  // Raw IP from proxy headers (may be IPv4 or IPv6).
  const rawIp = getClientIP(req.headers)

  // normalizedIp  — human-readable IP for logs (VARCHAR(45) is safe)
  // acoreIp       — safe for acore_auth VARCHAR(15) last_ip column:
  //                 IPv4 / IPv4-mapped → real IPv4; pure IPv6 → '127.0.0.1'
  const { normalizedIp, acoreIp, isIPv6: clientIsIPv6 } = normalizeIP(rawIp)

  // Rate limit by real client IP (string key — works for IPv4 and IPv6)
  const rl = rateLimit(`register:${normalizedIp}`, 5, 10 * 60 * 1000)
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

    // acoreIp is safe for VARCHAR(15): IPv4 or '127.0.0.1' for IPv6 clients.
    // The real client IP (normalizedIp) is recorded in cms_logs below.
    if (clientIsIPv6) {
      console.log(`[register] IPv6 client ${normalizedIp} → storing '127.0.0.1' in last_ip (VARCHAR(15) limit)`)
    }
    console.log(`[register] inserting account username="${usernameUpper}" acoreIp=${acoreIp}`)

    // Insertar en acore_auth.account — sin sha_pass_hash (columna inexistente en master 2026)
    // executeAuth devuelve ResultSetHeader directamente; NO usar queryAuth() para INSERT
    // porque queryAuth ya extrae la primera posición del tuple de mysql2 y devuelve un
    // objeto plano (no iterable), lo que causaba: TypeError: (intermediate value) is not iterable
    const insertResult = await executeAuth(
      `INSERT INTO account (username, salt, verifier, email, reg_mail, joindate, last_ip, locked, online, expansion)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, 0, 0, 2)`,
      [usernameUpper, saltBuffer, verifierBuffer, email, email, acoreIp],
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

    // Log de registro — normalizedIp es la IP real del cliente (VARCHAR(45), soporta IPv6)
    const logDetails = clientIsIPv6
      ? `Nueva cuenta: ${usernameUpper} (IPv6; last_ip AzerothCore: 127.0.0.1)`
      : `Nueva cuenta: ${usernameUpper}`
    await executeCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [accountId, 'REGISTRO', logDetails, normalizedIp],
    )

    // Auto-login
    const token = signToken({ id: accountId, username: usernameUpper, email, gmlevel: 0, expansion: 2 })

    const response = NextResponse.json({ success: true, message: '¡Cuenta creada! Bienvenido a WoW Argentina.' })
    response.headers.set('Set-Cookie', createSessionCookie(token))
    return response

  } catch (err) {
    // Log de error sin exponer contraseñas ni credenciales
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[register] error username="${username}" op=register ip=${normalizedIp} msg="${msg}"`)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
