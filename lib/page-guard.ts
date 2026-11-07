import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionWithAccess, type AuthorizedUser } from '@/lib/auth'
import { hasRole, type WebRole } from '@/lib/roles'
import { logUnauthorizedAttempt } from '@/lib/directivos'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

export const getCurrentUser = cache(getSessionWithAccess)

const logDenied = cache(async (accountId: number, username: string, path: string) => {
  const { normalizedIp } = normalizeIP(getClientIP(await headers()))
  await logUnauthorizedAttempt(accountId, username, path, normalizedIp)
})

/**
 * Server component / layout guard. Must be called by every server page that reads
 * protected data (a layout check alone does not stop sibling segments from rendering).
 */
export async function requirePageRole(min: WebRole, path: string): Promise<AuthorizedUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(path)}`)
  if (!hasRole(user.role, min)) {
    await logDenied(user.id, user.username, path)
    redirect(`/acceso-denegado?area=${encodeURIComponent(path)}`)
  }
  return user
}
