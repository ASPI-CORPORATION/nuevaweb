/**
 * Server-only RBAC helpers (use queryAuth — cannot be imported by client components).
 * Import from here in API routes and server components only.
 */

import { queryAuthFirst } from '@/lib/db'
import { RBAC_MIN, RBAC_MAX } from '@/lib/rbac'

/**
 * Returns the highest custom RBAC rank ID (90000–90009) assigned to accountId.
 * Returns null if no custom rank is assigned.
 */
export async function getAccountRbacRank(accountId: number): Promise<number | null> {
  const row = await queryAuthFirst<{ permission: number | null }>(
    `SELECT MAX(permission) AS permission
     FROM rbac_account_permissions
     WHERE id = ? AND permission BETWEEN ? AND ? AND granted = 1 AND realm_id = -1`,
    [accountId, RBAC_MIN, RBAC_MAX]
  )
  const val = row?.permission ?? null
  return val !== null ? Number(val) : null
}

/**
 * Returns how many accounts currently hold the Owner rank (90009).
 */
export async function countOwners(): Promise<number> {
  const row = await queryAuthFirst<{ c: number }>(
    `SELECT COUNT(*) AS c FROM rbac_account_permissions WHERE permission = 90009 AND granted = 1 AND realm_id = -1`
  )
  return Number(row?.c ?? 0)
}
