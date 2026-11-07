/**
 * Server-only RBAC helpers (use queryAuth — cannot be imported by client components).
 * Import from here in API routes and server components only.
 */

import { queryAuthFirst } from '@/lib/db'
import { getVerifiedRbacRank } from '@/lib/auth'

/** Highest registered custom RBAC rank (90000–90009) for the account, or null. */
export async function getAccountRbacRank(accountId: number): Promise<number | null> {
  return getVerifiedRbacRank(accountId)
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
