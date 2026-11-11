import { queryCms } from '@/lib/db'

/**
 * Active internal suspension of a staff member: while it lasts the account cannot use the
 * web GM tools (requireGm). Returns null when there is none or the table does not exist yet.
 */
export async function activeInternalSuspension(accountId: number) {
  const rows = await queryCms<{ id: number; ends_at: Date; reason: string }>(
    `SELECT id, ends_at, reason FROM cms_staff_suspensions
     WHERE account_id = ? AND scope = 'interna' AND status = 'vigente' AND starts_at <= NOW() AND ends_at > NOW()
     ORDER BY ends_at DESC LIMIT 1`, [accountId]
  ).catch(() => [])
  return rows[0] ?? null
}
