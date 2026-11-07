'use client'

import { motion } from 'framer-motion'
import { Users, Swords, TrendingUp, Star, Shield, Zap, Scale, MapPin } from 'lucide-react'

const benefits = [
  { Icon: Users, color: '#75C7FF', title: 'Comunidad Activa', desc: 'Miles de jugadores argentinos. Discord, eventos, raids, arenas organizadas.' },
  { Icon: Swords, color: '#FF6B4A', title: 'PvP Competitivo', desc: 'Arenas 2v2 y 3v3, battlegrounds, honor. Balance continuo de clases.' },
  { Icon: TrendingUp, color: '#4ade80', title: 'Progresión Híbrida', desc: 'Tres caminos únicos adaptados a tu estilo y tiempo disponible.' },
  { Icon: Star, color: '#F6B40E', title: 'Sets Exclusivos', desc: 'Equipamiento custom diseñado para Argentina. Tres tiers de poder.' },
  { Icon: Shield, color: '#a78bfa', title: 'Staff Activo', desc: 'Equipo de soporte real. Tickets respondidos, bugs corregidos rápido.' },
  { Icon: Scale, color: '#22d3ee', title: 'Balance Justo', desc: 'Clases ajustadas continuamente. Ninguna domina de forma absurda.' },
  { Icon: Zap, color: '#f97316', title: 'Eventos Únicos', desc: 'Eventos de temporada, torneos PvP, raids especiales y más.' },
  { Icon: MapPin, color: '#e879f9', title: 'Argentina First', desc: 'Servidores en Argentina. Mejor ping, mejor experiencia, comunidad local.' },
]

export function WhyPlaySection() {
  return (
    <section className="relative z-10 py-20 md:py-28 px-4"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(8,15,32,0.6), transparent)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.18)', color: '#75C7FF' }}>
            <Shield className="w-3.5 h-3.5" /> Por qué elegirnos
          </div>
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Por Qué Jugar en{' '}
            <span style={{ background: 'linear-gradient(135deg, #75C7FF, #FFFFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              WoW Argentina
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            No es solo un servidor. Es la experiencia completa diseñada para vos.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b, i) => (
            <motion.div key={b.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.07 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative rounded-2xl p-5 transition-all duration-300 cursor-default"
              style={{ background: 'rgba(10,20,42,0.6)', border: '1px solid rgba(117,199,255,0.07)', backdropFilter: 'blur(12px)' }}>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${b.color}0a, transparent)` }} />
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ border: `1px solid ${b.color}22` }} />

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${b.color}10`, border: `1px solid ${b.color}22` }}>
                <b.Icon className="w-5.5 h-5.5" style={{ color: b.color }} />
              </div>

              <h3 className="font-['Cinzel'] font-bold text-sm text-white mb-2">{b.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(117,199,255,0.1), transparent)' }} />
    </section>
  )
}
