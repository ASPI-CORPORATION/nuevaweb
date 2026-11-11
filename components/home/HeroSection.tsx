'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, MotionConfig } from 'framer-motion'
import { Download, Gamepad2, Users, Zap, Swords } from 'lucide-react'
import { SolDeMayo } from '@/components/brand/SolDeMayo'
import { DiscordIcon } from '@/components/brand/DiscordIcon'
import { DISCORD_URL, SITE } from '@/lib/site-config'
import { RealmlistCopy } from '@/components/brand/RealmlistCopy'
import { LaunchCountdown } from '@/components/home/LaunchCountdown'

// Deterministic positions: identical on server and client (no hydration mismatch)
const FLAKES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  s: 1 + ((i * 7) % 3),
  d: (i * 1.3) % 8,
  t: 10 + ((i * 3) % 8),
}))

function useCounter(target: number | null, ms = 1200) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (target === null) return
    const steps = 40
    let i = 0
    const t = setInterval(() => {
      i++
      setN(i >= steps ? target : Math.floor((target * i) / steps))
      if (i >= steps) clearInterval(t)
    }, ms / steps)
    return () => clearInterval(t)
  }, [target, ms])
  return n
}

export function HeroSection({ launchPending }: { launchPending: boolean }) {
  const [online, setOnline] = useState<number | null>(null)
  const display = useCounter(online)

  useEffect(() => {
    fetch('/api/stats/online').then(r => (r.ok ? r.json() : { count: 0 })).then(d => setOnline(Number(d.count) || 0)).catch(() => setOnline(0))
  }, [])

  const fade = (delay: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay } })

  return (
    <MotionConfig reducedMotion="user">
    <section className="relative overflow-hidden pt-16 min-h-[92svh] flex items-center">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(116,172,223,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_85%_35%,rgba(246,180,14,0.10),transparent_70%)]" />
        {/* Flag bands sweeping across the sky */}
        <div className="absolute -left-1/4 top-[18%] w-[150%] h-40 -rotate-6 opacity-[0.07] flex flex-col">
          <span className="flex-1 bg-[#74ACDF]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#74ACDF]" />
        </div>
        <SolDeMayo className="absolute right-[-12rem] top-[6rem] w-[34rem] h-[34rem] opacity-[0.10] sun-spin hidden sm:block" />
        <SolDeMayo className="absolute left-1/2 -translate-x-1/2 top-24 w-72 h-72 opacity-[0.07] sm:hidden" />
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className={`hero-flake absolute rounded-full bg-[#cfe6f8] motion-reduce:hidden ${i >= 10 ? 'hidden sm:block' : ''}`}
            style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.s, height: f.s, animationDuration: `${f.t}s`, animationDelay: `${f.d}s` }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#050A14]" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid gap-10 lg:grid-cols-[1fr_400px] items-center">
        <div className="text-center lg:text-left">
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6 border border-[#74ACDF]/30 bg-[#101F35]/70 text-[#cfe6f8]">
            <span className="flex flex-col w-5 h-3 rounded-[2px] overflow-hidden shrink-0" aria-hidden="true">
              <span className="flex-1 bg-[#74ACDF]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#74ACDF]" />
            </span>
            Instant 80 · PvP &amp; PvE · WotLK 3.3.5a
          </motion.div>

          <motion.h1 {...fade(0.08)} className="font-['Cinzel'] font-black leading-[0.95] mb-4 text-[clamp(2.35rem,11.5vw,6.5rem)]">
            <span className="block text-white">DOMINÁ</span>
            <span className="block bg-gradient-to-r from-[#74ACDF] via-white to-[#74ACDF] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(116,172,223,0.45)]">
              RASGANORTE
            </span>
          </motion.h1>

          <motion.p {...fade(0.16)} className="font-['Cinzel'] text-sm sm:text-lg tracking-[0.3em] uppercase text-[#F6B40E] mb-5">
            A tu manera
          </motion.p>

          <motion.div {...fade(0.19)}>
            <LaunchCountdown initiallyPending={launchPending} />
          </motion.div>

          <motion.p {...fade(0.22)} className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8">
            Viví la experiencia Instant 80 de WoW Argentina. Alcanzá el nivel máximo, equipate rápidamente y enfrentate a los
            desafíos de Rasganorte. ICC, raids, arenas y BGs con Crossfaction activado. ¡Tu aventura comienza en el nivel 80!
          </motion.p>

          <motion.div {...fade(0.3)} className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start mb-8">
            <Link href="/register" className="btn-gold px-7 py-3.5 text-base">
              <Gamepad2 className="w-5 h-5" /> Jugar ahora
            </Link>
            <Link href="/download" className="btn-ghost px-6 py-3.5 text-base">
              <Download className="w-5 h-5" /> Descargar
            </Link>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors">
              <DiscordIcon className="w-5 h-5" /> Discord
            </a>
          </motion.div>

          <motion.ol {...fade(0.38)} className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto lg:mx-0 text-left" aria-label="Cómo empezar">
            {[
              ['1', 'Descargá WoW 3.3.5a', '/download'],
              ['2', 'Creá tu cuenta', '/register'],
              ['3', 'Configurá el realmlist', '/download'],
              ['4', 'Preparate para jugar', '/download'],
            ].map(([n, label, href]) => (
              <li key={n}>
                <Link href={href} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-[#74ACDF]/40 transition-colors">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#74ACDF] text-[#050A14] text-xs font-black flex items-center justify-center">{n}</span>
                  <span className="text-xs sm:text-[13px] text-slate-200 leading-tight">{label}</span>
                </Link>
              </li>
            ))}
          </motion.ol>
        </div>

        {/* Realm card */}
        <motion.aside {...fade(0.45)} className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Estado del reino">
          <div className="absolute -inset-3 rounded-[28px] bg-[radial-gradient(ellipse_at_center,rgba(116,172,223,0.18),transparent_70%)] blur-xl" aria-hidden="true" />
          <div className="relative rounded-2xl border border-[#74ACDF]/25 bg-[#0A1628]/85 backdrop-blur-md overflow-hidden">
            <div className="flex h-1.5" aria-hidden="true"><span className="flex-1 bg-[#74ACDF]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#74ACDF]" /></div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative w-12 h-12 shrink-0">
                  <SolDeMayo className="absolute inset-0 w-full h-full" />
                </div>
                <div>
                  <div className="font-['Cinzel'] font-bold text-white text-lg">{SITE.realmName}</div>
                  <div className="text-xs text-slate-400">Wrath of the Lich King · AzerothCore</div>
                </div>
              </div>

              <div className="rounded-xl bg-[#101F35] border border-white/5 p-4 text-center mb-4">
                <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">
                  <Users className="w-3.5 h-3.5" /> Aventureros online
                </div>
                <div className="font-['Cinzel'] font-black text-4xl text-[#74ACDF]" aria-live="polite">{online === null ? '—' : display}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 flex items-center gap-2 text-slate-300"><Zap className="w-4 h-4 text-[#F6B40E]" /> Instant 80</div>
                <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 flex items-center gap-2 text-slate-300"><Swords className="w-4 h-4 text-[#75C7FF]" /> Crossfaction</div>
              </div>

              <div className="text-xs text-slate-400 mb-1.5">Realmlist oficial</div>
              <RealmlistCopy variant="inline" />
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
    </MotionConfig>
  )
}
