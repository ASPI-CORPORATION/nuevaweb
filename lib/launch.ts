/**
 * Official launch of WoW Argentina — Instant 80.
 * Viernes 13 de noviembre de 2026, 18:00 hora de Argentina (America/Argentina/Buenos_Aires, UTC-3).
 *
 * The ISO string carries its own offset, so LAUNCH_AT is an absolute instant: every visitor,
 * in any country or browser time zone, counts down to the same moment.
 */
export const LAUNCH = {
  iso: '2026-11-13T18:00:00-03:00',
  timeZone: 'America/Argentina/Buenos_Aires',
  label: 'Viernes 13 de noviembre — 18:00 HS ARG',
} as const

export const LAUNCH_AT = Date.parse(LAUNCH.iso)

/** After launch, "¡YA ESTÁ DISPONIBLE!" may show for this long — only if the worldserver is really online. */
export const LAUNCH_BANNER_MS = 6 * 60 * 60 * 1000

export function isLaunchPending(now: number = Date.now()) {
  return now < LAUNCH_AT
}

export interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; totalMs: number }

/** Remaining time until launch, never negative. */
export function timeLeft(now: number): TimeLeft {
  const totalMs = Math.max(0, LAUNCH_AT - now)
  const s = Math.floor(totalMs / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs,
  }
}
