import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { queryAuthFirst, queryCms } from '@/lib/db'
import { computePassHash, computeVerifier } from '@/lib/srp6'
import { rateLimit } from '@/lib/rate-limit'
import { signToken, createSessionCookie, getFullGmLevel } from '@/lib/auth'

const schema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
})

interface AccountRow {
  id: number
  username: string
  email: string
  sha_pass_hash: string
  verifier: Buffer
  salt: Buffer
  expansion: number
  locked: number
}

interface BanRow {
  active: number
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Rate limit: 10 intentos por IP cada 15 min
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá 15 minutos.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 400 })
  }

  const { username, password } = parsed.data

  try {
    const account = await queryAuthFirst<AccountRow>(
      'SELECT id, username, email, sha_pass_hash, verifier, salt, expansion, locked FROM account WHERE UPPER(username) = UPPER(?)',
      [username]
    )

    if (!account) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    // Verificar ban
    const ban = await queryAuthFirst<BanRow>(
      'SELECT active FROM account_banned WHERE id = ? AND active = 1',
      [account.id]
    )
    if (ban) {
      return NextResponse.json({ error: 'Tu cuenta está suspendida. Creá un ticket de soporte.' }, { status: 403 })
    }

    // Verificar contraseña SRP6
    // AzerothCore usa: sha_pass_hash = SHA1(UPPER(user):UPPER(pass))
    const expectedHash = computePassHash(account.username, password)

    // Comparar sha_pass_hash (método legacy, siempre presente)
    if (account.sha_pass_hash.toUpperCase() !== expectedHash.toUpperCase()) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    // Obtener GM level real
    const gmlevel = await getFullGmLevel(account.id)

    // Actualizar last_login y last_ip
    await queryAuthFirst(
      'UPDATE account SET last_login = NOW(), last_ip = ? WHERE id = ?',
      [ip, account.id]
    )

    // Log de login
    await queryCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [account.id, 'LOGIN', `Login web: ${account.username}`, ip]
    )

    const token = signToken({
      id: account.id,
      username: account.username,
      email: account.email,
      gmlevel,
      expansion: account.expansion,
    })

    const response = NextResponse.json({ success: true, user: { id: account.id, username: account.username, gmlevel } })
    response.headers.set('Set-Cookie', createSessionCookie(token))
    return response

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
