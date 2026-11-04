'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Sword, Users, Zap } from 'lucide-react'

export function HeroSection() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    fetch('/api/stats/online')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(data => setOnlineCount(data.count ?? 0))
      .catch(() => setOnlineCount(0))
  }, [])

  // Contador animado
  useEffect(() => {
    if (onlineCount === null) return
    const duration = 1500
    const steps = 60
    const stepTime = duration / steps
    const increment = onlineCount / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= onlineCount) {
        setDisplayCount(onlineCount)
        clearInterval(timer)
      } else {
        setDisplayCount(Math.floor(current))
      }
    }, stepTime)
    return () => clearInterval(timer)
  }, [onlineCount])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Fondo con gradiente */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(117,199,255,0.08) 0%, rgba(5,10,20,0) 60%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 70% 60%, rgba(117,199,255,0.04) 0%, transparent 60%)',
          }}
        />
        {/* Líneas decorativas */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400"></span>
          Servidor Online • WotLK 3.3.5a • AzerothCore 2026
        </motion.div>

        {/* Título principal */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-['Cinzel'] font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-4 leading-none"
        >
          <span className="block text-white">DOMINÁ</span>
          <span
            className="block"
            style={{
              background: 'linear-gradient(135deg, #75C7FF 0%, #FFFFFF 50%, #75C7FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(117,199,255,0.4))',
            }}
          >
            RASGANORTE
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-['Cinzel'] text-xl md:text-2xl text-blue-300/80 mb-4 tracking-widest uppercase"
        >
          A Tu Manera
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 font-['Inter']"
        >
          El servidor WoW Argentina con tres caminos: Blizzlike agilizado, Instant 80, y Leveo Rápido.
          Sets Custom exclusivos argentinos, comunidad activa, eventos únicos.
        </motion.p>

        {/* Botones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap gap-4 justify-center mb-12"
        >
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(117,199,255,0.4)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-['Cinzel'] font-semibold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-colors"
            >
              <Sword className="w-5 h-5" />
              JUGAR AHORA
            </motion.button>
          </Link>
          <Link href="/download">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-8 py-4 bg-transparent hover:bg-white/5 text-white font-['Cinzel'] font-semibold text-lg rounded-xl border border-white/20 hover:border-white/40 transition-all"
            >
              <Download className="w-5 h-5" />
              DESCARGAR
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap gap-8 justify-center"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white font-['Cinzel']">
                {onlineCount === null ? (
                  <span className="inline-block w-12 h-6 skeleton rounded"></span>
                ) : displayCount}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Online ahora</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white font-['Cinzel']">3</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Caminos de juego</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Sword className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white font-['Cinzel']">Sets</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Custom Argentinos</div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
