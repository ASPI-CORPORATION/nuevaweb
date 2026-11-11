'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AnimatePresence, motion } from 'framer-motion'
import { PartyPopper } from 'lucide-react'
import { LAUNCH, LAUNCH_AT, LAUNCH_BANNER_MS, timeLeft } from '@/lib/launch'

// ── Shared one-second clock ─────────────────────────────────────────────────
// useSyncExternalStore: the server snapshot is null, so the first client render matches the
// HTML exactly (no hydration mismatch); real time is read right after hydration.
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
/** After this instant nothing on screen depends on time, so the interval stops for good. */
const CLOCK_END = LAUNCH_AT + LAUNCH_BANNER_MS

function stopClock() {
  if (timer) { clearInterval(timer); timer = undefined }
}
function subscribeClock(cb: () => void) {
  listeners.add(cb)
  if (!timer && Date.now() < CLOCK_END) {
    timer = setInterval(() => {
      listeners.forEach(l => l())
      if (Date.now() >= CLOCK_END) stopClock()
    }, 1000)
  }
  return () => {
    listeners.delete(cb)
    if (!listeners.size) stopClock()
  }
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000
const getServerNow = () => null

function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, getNow, getServerNow)
}

const statusFetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))

const UNITS = [
  ['days', 'Días'],
  ['hours', 'Horas'],
  ['minutes', 'Minutos'],
  ['seconds', 'Segundos'],
] as const

/**
 * Launch countdown for the Hero. `initiallyPending` comes from the server render so that,
 * after the launch, the HTML no longer reserves any space for it.
 * It hides itself at LAUNCH_AT without a reload or a code change.
 */
export function LaunchCountdown({ initiallyPending }: { initiallyPending: boolean }) {
  const now = useNow()
  const pending = now === null ? initiallyPending : now < LAUNCH_AT
  const inBannerWindow = now !== null && now >= LAUNCH_AT && now < CLOCK_END

  // "Ya está disponible" only when the worldserver really answers (real SOAP check).
  const { data: status } = useSWR(inBannerWindow ? '/api/stats/status' : null, statusFetcher, { refreshInterval: 60_000 })
  const showAvailable = inBannerWindow && status?.world === true

  const left = timeLeft(now ?? LAUNCH_AT - 1)

  return (
    <AnimatePresence initial={false}>
      {pending && (
        <motion.div key="countdown"
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden mb-7 max-w-xl mx-auto lg:mx-0"
          role="timer" aria-label={`Cuenta regresiva para el lanzamiento: ${LAUNCH.label}`}>
          <p className="font-['Cinzel'] text-[11px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#F6B40E] mb-3 drop-shadow-[0_0_12px_rgba(246,180,14,0.35)]">
            El lanzamiento se acerca
          </p>
          <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
            {UNITS.map(([key, label]) => {
              const value = now === null ? '--' : String(left[key]).padStart(2, '0')
              return (
                <div key={key} data-unit={key} data-value={value}
                  className="relative overflow-hidden rounded-xl border border-[#F6B40E]/25 bg-[#0A1628]/85 backdrop-blur-sm px-1 pt-2.5 pb-2 sm:pt-3.5 sm:pb-3 text-center shadow-[0_0_24px_rgba(116,172,223,0.14),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F6B40E]/60 to-transparent" />
                  <span className="countdown-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
                  <div className="relative h-[clamp(1.9rem,8.5vw,3rem)] flex items-center justify-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={value}
                        initial={{ y: '-60%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '60%', opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="font-['Cinzel'] font-black tabular-nums leading-none text-[clamp(1.55rem,7.5vw,2.6rem)] text-white drop-shadow-[0_0_14px_rgba(116,172,223,0.75)]">
                        {value}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="relative mt-1 text-[9px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase text-[#cfe6f8]/70">{label}</div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-sm sm:text-base text-[#cfe6f8]">
            {LAUNCH.label}
          </p>
          <span className="sr-only">
            {now === null ? '' : `Faltan ${left.days} días, ${left.hours} horas y ${left.minutes} minutos.`}
          </span>
        </motion.div>
      )}
      {!pending && showAvailable && (
        <motion.div key="available"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="overflow-hidden mb-7 max-w-xl mx-auto lg:mx-0" role="status">
          <Link href="/register"
            className="flex items-center justify-center lg:justify-start gap-2 rounded-xl border border-[#F6B40E]/35 bg-[#F6B40E]/[0.08] px-4 py-3 font-['Cinzel'] font-black tracking-wider text-[#F6B40E] hover:bg-[#F6B40E]/[0.14] transition-colors">
            <PartyPopper className="w-5 h-5 shrink-0" aria-hidden="true" /> ¡WOW ARGENTINA YA ESTÁ DISPONIBLE!
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
