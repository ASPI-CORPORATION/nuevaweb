import { queryCms } from '@/lib/db'
import type { NextRequest } from 'next/server'

/**
 * Verifies gmlevel = 10. Returns the session object or a 403 response.
 * Also logs the action to cms_directivos_logs.
 */
export async function requireDirectivo(req: NextRequest) {
  const { requireGmLevel } = await import('@/lib/auth')
  const result = await requireGmLevel(req, 10)
  return result
}

export async function logDirectivoAction(
  directivoId: number,
  targetAccountId: number | null,
  action: string,
  details: string,
  ip: string
) {
  await queryCms(
    'INSERT INTO cms_directivos_logs (directivo_account_id, target_account_id, action, details, ip) VALUES (?, ?, ?, ?, ?)',
    [directivoId, targetAccountId, action, details, ip]
  )
}
