import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { queryAuthFirst, queryCms, executeAuth } from '@/lib/db'
import { verifyPassword } from '@/lib/srp6'
import { rateLimit } from '@/lib/rate-limit'
import { signToken, createSessionCookie, getAccountAccess } from '@/lib/auth'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

const schema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
})

interface AccountRow {
  id: number
  username: string
  email: string
  salt: Buffer
  verifier: Buffer
  expansion: number
  locked: number
}

interface BanRow {
  active: number
}

export async function POST(req: NextRequest) {
  const { normalizedIp: ip, acoreIp } = normalizeIP(getClientIP(req.headers))

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
      'SELECT id, username, email, salt, verifier, expansion, locked FROM account WHERE UPPER(username) = UPPER(?)',
      [username]
    )

    if (!account) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    // Verificar ban activo
    const ban = await queryAuthFirst<BanRow>(
      'SELECT active FROM account_banned WHERE id = ? AND active = 1',
      [account.id]
    )
    if (ban) {
      return NextResponse.json({ error: 'Tu cuenta está suspendida. Creá un ticket de soporte.' }, { status: 403 })
    }

    // Verificar contraseña via SRP6 (compara verifier calculado con el almacenado)
    const saltBuf = Buffer.isBuffer(account.salt) ? account.salt : Buffer.from(account.salt)
    const verifierBuf = Buffer.isBuffer(account.verifier) ? account.verifier : Buffer.from(account.verifier)

    if (!verifyPassword(account.username, password, saltBuf, verifierBuf)) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    const access = await getAccountAccess(account.id)
    const gmlevel = access.gmlevel

    // last_ip es VARCHAR(15) en AzerothCore: solo IPv4 (IPv6 → '127.0.0.1', la real queda en cms_logs)
    await executeAuth(
      'UPDATE account SET last_login = NOW(), last_ip = ? WHERE id = ?',
      [acoreIp, account.id]
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

    const response = NextResponse.json({ success: true, user: { id: account.id, username: account.username, gmlevel, role: access.role } })
    response.headers.set('Set-Cookie', createSessionCookie(token))
    return response

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
