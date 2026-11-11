import { NextRequest, NextResponse } from 'next/server'
import { requireGm, maskIp } from '@/lib/gm/access.server'
import { AUTH_DB, queryCms } from '@/lib/db'
import { can } from '@/lib/gm/permissions'
import { actionErrorResponse } from '@/lib/gm/http.server'

/**
 * GM activity log (cms_gm_logs, read-only). GM 1: no access. GM 2: entries from tier ≤ 2
 * (their level and below), IPs masked. GM 3: every GM entry. Directivos logs live in a
 * separate table and are never exposed here.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireGm(req, 'auditPartial')
  if (ctx instanceof Response) return ctx

  const sp = req.nextUrl.searchParams
  const where: string[] = []
  const params: unknown[] = []
  const gm = sp.get('gm')?.trim()
  const action = sp.get('action')?.trim()
  const target = Number(sp.get('target') || 0)
  const from = sp.get('from'), to = sp.get('to')
  if (gm) { where.push('(l.gm_name LIKE ? OR ga.username LIKE ?)'); params.push(`%${gm}%`, `%${gm}%`) }
  if (action) { where.push('l.action = ?'); params.push(action.slice(0, 100)) }
  if (target) { where.push('l.target_account_id = ?'); params.push(target) }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) { where.push('l.created_at >= ?'); params.push(`${from} 00:00:00`) }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) { where.push('l.created_at <= ?'); params.push(`${to} 23:59:59`) }
  if (!can(ctx.tier, 'auditFull')) where.push('(l.gm_tier IS NULL OR l.gm_tier <= 2)')
  const page = Math.max(1, Number(sp.get('page') || 1) || 1)
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const [rows, total, actions] = await Promise.all([
      queryCms<Record<string, unknown>>(
        `SELECT l.*, COALESCE(l.gm_name, ga.username) AS gm_display, ta.username AS target_name
         FROM cms_gm_logs l
         LEFT JOIN ${AUTH_DB}.account ga ON ga.id = l.gm_account_id
         LEFT JOIN ${AUTH_DB}.account ta ON ta.id = l.target_account_id
         ${whereSql} ORDER BY l.id DESC LIMIT 50 OFFSET ?`,
        [...params, (page - 1) * 50]
      ),
      queryCms<{ c: number }>(`SELECT COUNT(*) AS c FROM cms_gm_logs l LEFT JOIN ${AUTH_DB}.account ga ON ga.id = l.gm_account_id ${whereSql}`, params),
      queryCms<{ action: string }>('SELECT DISTINCT action FROM cms_gm_logs ORDER BY action'),
    ])

    let staff: unknown[] | null = null
    if (can(ctx.tier, 'staffSupervision') && sp.get('staff') === '1') {
      staff = await queryCms(
        `SELECT x.id, a.username, MAX(x.gmlevel) AS gmlevel, a.online, a.last_login,
                (SELECT COUNT(*) FROM cms_gm_logs l WHERE l.gm_account_id = x.id AND l.created_at > NOW() - INTERVAL 7 DAY) AS actions_7d,
                (SELECT COUNT(*) FROM cms_gm_sanctions s WHERE s.gm_account_id = x.id AND s.starts_at > NOW() - INTERVAL 30 DAY) AS sanctions_30d,
                (SELECT COUNT(*) FROM cms_tickets t WHERE t.assigned_to = x.id AND t.status IN ('Aceptado','En Revisión')) AS open_tickets,
                (SELECT COUNT(*) FROM cms_tickets t WHERE t.closed_by = x.id AND t.closed_at > NOW() - INTERVAL 30 DAY) AS closed_30d
         FROM ${AUTH_DB}.account_access x JOIN ${AUTH_DB}.account a ON a.id = x.id
         WHERE x.gmlevel > 0
         GROUP BY x.id, a.username, a.online, a.last_login
         ORDER BY gmlevel DESC, a.username`
      ).catch(() => [])
    }

    return NextResponse.json({
      page, total: Number(total[0]?.c ?? 0), scope: can(ctx.tier, 'auditFull') ? 'completo' : 'parcial',
      actions: actions.map(a => a.action),
      logs: rows.map(r => ({
        id: r.id, createdAt: r.created_at, gmId: r.gm_account_id, gm: r.gm_display, gmTier: r.gm_tier ?? null,
        targetId: r.target_account_id, target: r.target_name, character: r.target_character ?? null,
        action: r.action, reason: r.reason ?? null, result: r.result ?? null, reference: r.reference ?? null,
        details: r.details, ip: maskIp(r.ip as string | null, ctx.tier),
      })),
      staff,
    })
  } catch (err) {
    return actionErrorResponse(err, 'audit')
  }
}
