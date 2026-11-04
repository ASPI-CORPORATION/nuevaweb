'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Sword, Users, Zap, Shield } from 'lucide-react'

interface Particle { id: number; x: number; y: number; size: number; delay: number; dur: number }

function useCounter(target: number | null, ms = 1400) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (target === null) return
    const steps = 60; const inc = target / steps; let cur = 0
    const t = setInterval(() => {
      cur += inc
      if (cur >= target) { setN(target); clearInterval(t) }
      else setN(Math.floor(cur))
    }, ms / steps)
    return () => clearInterval(t)
  }, [target, ms])
  return n
}

export function HeroSection() {
  const [online, setOnline] = useState<number | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const display = useCounter(online)

  useEffect(() => {
    fetch('/api/stats/online').then(r => r.ok ? r.json() : { count: 0 }).then(d => setOnline(d.count ?? 0)).catch(() => setOnline(0))
  }, [])

  useEffect(() => {
    setParticles(Array.from({ length: 50 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5, delay: Math.random() * 10, dur: Math.random() * 8 + 10,
    })))
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 110% 70% at 50% -5%, rgba(117,199,255,0.14) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 15% 60%, rgba(29,78,216,0.12) 0%, transparent 55%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 85% 40%, rgba(29,78,216,0.1) 0%, transparent 55%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 55%, #050A14 100%)' }} />

        {/* Aurora lines */}
        {[25, 55, 75].map((top, i) => (
          <div key={i} className="absolute left-0 right-0 h-px" style={{
            top: `${top}%`,
            background: `linear-gradient(to right, transparent 0%, rgba(117,199,255,${0.04 + i * 0.03}) 30%, rgba(117,199,255,${0.08 + i * 0.03}) 50%, rgba(117,199,255,${0.04 + i * 0.03}) 70%, transparent 100%)`,
          }} />
        ))}

        {/* Frost particles */}
        {particles.map(p => (
          <motion.div key={p.id} className="absolute rounded-full"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: 'rgba(117,199,255,0.4)' }}
            animate={{ y: [0, -40, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Bottom divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(117,199,255,0.25), transparent)' }} />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-24 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">

        {/* Left */}
        <div className="text-center lg:text-left">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-sm mb-7 font-medium"
            style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.2)', color: '#75C7FF' }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            Servidor Online
            <span style={{ color: 'rgba(117,199,255,0.3)' }}>•</span>
            <span style={{ color: 'rgba(117,199,255,0.6)' }}>WotLK 3.3.5a</span>
          </motion.div>

          {/* Title */}
          <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="font-['Cinzel'] font-black leading-[0.9] mb-5"
            style={{ fontSize: 'clamp(3.8rem, 9vw, 7rem)' }}>
            <span className="block text-white">DOMINÁ</span>
            <span className="block" style={{
              background: 'linear-gradient(135deg, #75C7FF 0%, #FFFFFF 45%, #75C7FF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 0 50px rgba(117,199,255,0.6))',
            }}>RASGANORTE</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="font-['Cinzel'] text-xl mb-4 tracking-[0.35em] uppercase"
            style={{ color: 'rgba(117,199,255,0.65)' }}>
            A Tu Manera
          </motion.p>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-400 text-lg max-w-lg mx-auto lg:mx-0 mb-9 leading-relaxed">
            Tres caminos únicos, sets custom argentinos, PvP competitivo y una comunidad que te espera.
            El servidor WoW WotLK más épico de Argentina.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center lg:justify-start mb-11">
            <Link href="/register">
              <motion.button whileHover={{ scale: 1.04, boxShadow: '0 0 50px rgba(37,99,235,0.5)' }} whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-['Cinzel'] font-bold text-base text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
                  border: '1px solid rgba(117,199,255,0.4)',
                  boxShadow: '0 4px 24px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}>
                <Sword className="w-5 h-5" />
                JUGAR AHORA
              </motion.button>
            </Link>
            <Link href="/download">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-['Cinzel'] font-bold text-base transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.8)',
                }}>
                <Download className="w-5 h-5" />
                DESCARGAR
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-wrap gap-7 justify-center lg:justify-start">
            {[
              { Icon: Users, color: '#4ade80', bg: 'rgba(74,222,128,0.1)', bd: 'rgba(74,222,128,0.2)', val: online === null ? '…' : display.toString(), lbl: 'Online ahora' },
              { Icon: Zap, color: '#75C7FF', bg: 'rgba(117,199,255,0.1)', bd: 'rgba(117,199,255,0.2)', val: '3', lbl: 'Caminos de juego' },
              { Icon: Shield, color: '#FFD700', bg: 'rgba(255,215,0,0.1)', bd: 'rgba(255,215,0,0.2)', val: '3+', lbl: 'Sets exclusivos' },
            ].map(s => (
              <div key={s.lbl} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: s.bg, border: `1px solid ${s.bd}` }}>
                  <s.Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="font-['Cinzel'] font-black text-xl text-white leading-none">{s.val}</div>
                  <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">{s.lbl}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: server status panel */}
        <motion.div initial={{ opacity: 0, x: 48, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.9, delay: 0.6 }}
          className="hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl blur-2xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(117,199,255,0.08) 0%, transparent 70%)' }} />
            <div className="relative rounded-2xl overflow-hidden"
              style={{ background: 'rgba(5,15,38,0.88)', border: '1px solid rgba(117,199,255,0.14)', backdropFilter: 'blur(24px)' }}>

              {/* Panel titlebar */}
              <div className="px-5 py-3 flex items-center gap-3 border-b"
                style={{ borderColor: 'rgba(117,199,255,0.08)', background: 'rgba(117,199,255,0.03)' }}>
                <div className="flex gap-1.5">
                  {['bg-red-500/60','bg-yellow-500/60','bg-green-500/60'].map((c,i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                  ))}
                </div>
                <span className="text-xs font-mono" style={{ color: 'rgba(117,199,255,0.5)' }}>realm.wowargentina</span>
              </div>

              {/* Status rows */}
              <div className="p-5 space-y-2.5 font-mono text-sm">
                {[
                  { k: 'authserver', v: 'ONLINE', dot: true, vc: '#4ade80' },
                  { k: 'worldserver', v: 'ONLINE', dot: true, vc: '#4ade80' },
                  { k: 'versión', v: 'WotLK 3.3.5a', dot: false, vc: '#75C7FF' },
                  { k: 'core', v: 'AzerothCore 2026', dot: false, vc: '#75C7FF' },
                  { k: 'expansión', v: 'Wrath of the Lich King', dot: false, vc: '#a78bfa' },
                ].map(r => (
                  <div key={r.k} className="flex items-center justify-between gap-4">
                    <span style={{ color: '#3d5577' }}>{r.k}</span>
                    <span className="flex items-center gap-1.5" style={{ color: r.vc }}>
                      {r.dot && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                      {r.v}
                    </span>
                  </div>
                ))}

                {/* Realmlist box */}
                <div className="pt-3 mt-1 border-t" style={{ borderColor: 'rgba(117,199,255,0.08)' }}>
                  <div className="text-xs mb-1.5" style={{ color: '#3d5577' }}>realmlist</div>
                  <div className="px-3 py-2 rounded-lg text-xs font-mono break-all"
                    style={{ background: 'rgba(117,199,255,0.06)', color: '#75C7FF', border: '1px solid rgba(117,199,255,0.12)' }}>
                    {process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar'}
                  </div>
                </div>

                {/* Live counter */}
                <div className="pt-3 border-t text-center" style={{ borderColor: 'rgba(117,199,255,0.08)' }}>
                  <div className="font-['Cinzel'] font-black text-4xl" style={{ color: '#75C7FF', filter: 'drop-shadow(0 0 16px rgba(117,199,255,0.4))' }}>
                    {online === null ? '—' : display}
                  </div>
                  <div className="text-xs mt-1 tracking-widest uppercase" style={{ color: '#3d5577' }}>
                    aventureros online
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Explorar</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="w-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
        </motion.div>
      </motion.div>
    </section>
  )
}
