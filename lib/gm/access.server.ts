import { NextResponse, type NextRequest } from 'next/server'
import { requireRole, getAccountAccess, getSessionFromRequest, type AuthorizedUser } from '@/lib/auth'
import { queryAuthFirst } from '@/lib/db'
import { logUnauthorizedAttempt } from '@/lib/directivos'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'
import { rateLimit } from '@/lib/rate-limit'
import { adaptiveInsert } from '@/lib/adaptive-insert.server'
import { can, resolveGmTier, type GmCap, type GmTier, GM_TIER_SHORT } from '@/lib/gm/permissions'

export interface GmContext {
  user: AuthorizedUser
  tier: GmTier
  ip: string
}

export const DENIED = 'No tenés autorización para realizar esta acción.'

export function tierOfAccess(access: AuthorizedUser['access']): GmTier {
  return resolveGmTier({ gmlevel: access.gmlevel, rbacRankId: access.rbacRankId, isDirectivo: !!access.directivo })
}

/**
 * Server-side gate for every GM API: session → DB-verified role → GM tier → capability.
 * Nothing is taken from the JWT except the account id.
 */
export async function requireGm(req: NextRequest, cap: GmCap): Promise<GmContext | Response> {
  const result = await requireRole(req, 'gm')
  const ip = normalizeIP(getClientIP(req.headers)).normalizedIp
  if (result instanceof Response) {
    if (result.status === 403) {
      const s = getSessionFromRequest(req)
      await logUnauthorizedAttempt(s?.id ?? null, s?.username ?? 'anónimo', req.nextUrl.pathname, ip)
    }
    return result
  }
  const tier = tierOfAccess(result.access)
  if (tier === 0 || !can(tier, cap)) {
    await logUnauthorizedAttempt(result.id, result.username, `${req.nextUrl.pathname} (${cap})`, ip)
    return NextResponse.json({ error: DENIED }, { status: 403 })
  }
  return { user: result, tier, ip }
}

/** Rate limit for state-changing GM operations. */
export function gmRateLimit(ctx: GmContext, bucket: string, max = 60, windowMs = 10 * 60 * 1000): Response | null {
  const rl = rateLimit(`gm:${bucket}:${ctx.user.id}`, max, windowMs)
  return rl.success ? null : NextResponse.json({ error: 'Demasiadas acciones seguidas. Esperá unos minutos.' }, { status: 429 })
}

export interface TargetInfo { id: number; username: string; tier: GmTier; isDirectivo: boolean; isOwner: boolean }

export async function getTargetInfo(accountId: number): Promise<TargetInfo | null> {
  const acc = await queryAuthFirst<{ id: number; username: string }>('SELECT id, username FROM account WHERE id = ?', [accountId])
  if (!acc) return null
  const access = await getAccountAccess(accountId)
  return {
    id: acc.id,
    username: acc.username,
    tier: tierOfAccess({ ...access }),
    isDirectivo: !!access.directivo,
    isOwner: access.directivo?.rank === 'propietario',
  }
}

/**
 * Hierarchy rule for every action on an account (sanctions and character tools):
 * not yourself, never Directivos/Propietario, never staff of equal or higher tier.
 */
export function hierarchyError(ctx: GmContext, target: TargetInfo): string | null {
  if (target.id === ctx.user.id) return 'No podés aplicar acciones GM sobre tu propia cuenta.'
  if (target.isDirectivo) return 'Los Directivos y el Propietario están protegidos.'
  if (target.tier >= ctx.tier) {
    return `No podés actuar sobre ${target.username}: es staff de nivel igual o superior (${GM_TIER_SHORT[target.tier]}).`
  }
  return null
}

export async function gmLog(ctx: GmContext, entry: {
  action: string
  targetAccountId?: number | null
  targetCharacter?: string | null
  reason?: string | null
  result: 'ok' | 'error' | 'denegado'
  reference?: string | null
  details: string
}) {
  try {
    await adaptiveInsert('cms_gm_logs', {
      gm_account_id: ctx.user.id,
      gm_name: ctx.user.username,
      gm_tier: ctx.tier,
      target_account_id: entry.targetAccountId ?? null,
      target_character: entry.targetCharacter ?? null,
      action: entry.action,
      reason: entry.reason ?? null,
      result: entry.result,
      reference: entry.reference ?? null,
      details: entry.details,
      ip: ctx.ip,
    })
  } catch (err) {
    console.error('[gm:audit] could not write cms_gm_logs:', err instanceof Error ? err.message : err)
  }
}

/** Personal data by tier: GM1 none, GM2 masked, GM3 full. */
export function maskEmail(email: string | null | undefined, tier: GmTier): string | null {
  if (!email) return null
  if (can(tier, 'viewPiiFull')) return email
  if (!can(tier, 'viewPiiMasked')) return null
  const [user, domain] = email.split('@')
  if (!domain) return '•••'
  return `${user.slice(0, 1)}•••@${domain}`
}

export function maskIp(ip: string | null | undefined, tier: GmTier): string | null {
  if (!ip) return null
  if (can(tier, 'viewPiiFull')) return ip
  if (!can(tier, 'viewPiiMasked')) return null
  if (ip.includes(':')) return ip.split(':').slice(0, 2).join(':') + ':••••'
  const p = ip.split('.')
  return p.length === 4 ? `${p[0]}.${p[1]}.•.•` : '•••'
}
