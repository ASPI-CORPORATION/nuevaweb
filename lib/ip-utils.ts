/**
 * IP address utilities for WoW Argentina CMS.
 *
 * AzerothCore stores IPs in VARCHAR(15) columns (last_ip, last_attempt_ip),
 * which only fit IPv4 addresses (max 15 chars: "255.255.255.255").
 * IPv6 addresses (up to 39 chars) must NOT be written to those columns.
 *
 * Rules:
 *  - Pure IPv4  → safe for acore_auth VARCHAR(15)
 *  - IPv4-mapped IPv6 (::ffff:x.x.x.x) → extract the IPv4 part → safe
 *  - Pure IPv6  → store '127.0.0.1' in acore_auth, real IP goes to cms_logs
 *  - 'unknown' / empty → store '127.0.0.1' in acore_auth
 */

/** True if the string is a dotted-decimal IPv4 address. */
export function isIPv4(ip: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)
}

/** True if the string looks like an IPv6 address (contains '::'). */
export function isIPv6(ip: string): boolean {
  return ip.includes(':')
}

/**
 * Extracts the IPv4 address embedded in an IPv4-mapped IPv6 address.
 * "::ffff:192.168.1.1"  → "192.168.1.1"
 * "::ffff:c0a8:0101"    → null  (hex form — leave as-is; AzerothCore won't see it)
 * Anything else         → null
 */
export function extractIPv4FromMapped(ip: string): string | null {
  const m = ip.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
  return m ? m[1] : null
}

/**
 * Normalizes a raw IP string extracted from request headers.
 *
 * Returns:
 *   normalizedIp — the best human-readable representation of the IP.
 *                  IPv4-mapped IPv6 is unwrapped to plain IPv4.
 *   acoreIp     — safe value for VARCHAR(15) columns in acore_auth.
 *                 Either the IPv4 address or '127.0.0.1' for pure IPv6.
 *   isIPv6      — true when the original address was IPv6.
 */
export function normalizeIP(raw: string): {
  normalizedIp: string
  acoreIp: string
  isIPv6: boolean
} {
  const trimmed = raw.trim()

  // IPv4-mapped IPv6 (Node.js / proxies often return these)
  const mapped = extractIPv4FromMapped(trimmed)
  if (mapped) {
    return { normalizedIp: mapped, acoreIp: mapped, isIPv6: false }
  }

  // Pure IPv4
  if (isIPv4(trimmed)) {
    return { normalizedIp: trimmed, acoreIp: trimmed, isIPv6: false }
  }

  // Pure IPv6 or unknown — cannot go into VARCHAR(15)
  const isV6 = isIPv6(trimmed)
  return {
    normalizedIp: trimmed || 'unknown',
    acoreIp: '127.0.0.1',
    isIPv6: isV6,
  }
}

/**
 * Extracts and normalizes the client IP from Next.js request headers.
 * Handles x-forwarded-for lists (takes the first / leftmost entry).
 */
export function getClientIP(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') ?? 'unknown'
}
