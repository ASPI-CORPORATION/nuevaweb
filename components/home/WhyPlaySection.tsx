'use client'

import { motion } from 'framer-motion'
import { Users, Swords, Shield, Zap, Snowflake, ArrowLeftRight, CalendarHeart, LifeBuoy } from 'lucide-react'

const benefits = [
  { Icon: Zap, color: '#F6B40E', title: 'Nivel Máximo Inmediato', desc: 'Con la modalidad Instant 80 alcanzás el nivel 80 rápidamente y vas directo al contenido endgame de Wrath of the Lich King.' },
  { Icon: Shield, color: '#75C7FF', title: 'Equipamiento Inicial', desc: 'El servidor te ofrece formas de equiparte rápido para empezar a participar en actividades PvP y PvE desde el primer día.' },
  { Icon: Swords, color: '#FF6B4A', title: 'PvP Competitivo', desc: 'Arenas, campos de batalla y combates entre jugadores para poner a prueba tu habilidad y tu equipo.' },
  { Icon: Snowflake, color: '#22d3ee', title: 'PvE de WotLK', desc: 'Raids de Rasganorte, Ciudadela de la Corona de Hielo, mazmorras y todo el contenido de nivel 80.' },
  { Icon: ArrowLeftRight, color: '#a78bfa', title: 'Crossfaction', desc: 'Habilitado para raids y BGs: jugadores de distintas facciones comparten grupos y partidas, según la configuración del servidor.' },
  { Icon: Users, color: '#4ade80', title: 'Comunidad Argentina', desc: 'Una comunidad argentina e hispanohablante que juega, organiza y habla tu idioma.' },
  { Icon: CalendarHeart, color: '#f97316', title: 'Eventos del Staff', desc: 'Eventos organizados por el Staff de WoW Argentina para toda la comunidad.' },
  { Icon: LifeBuoy, color: '#e879f9', title: 'Soporte desde la Web', desc: 'Tickets de soporte y gestión de tu cuenta desde la web, atendidos por el Staff.' },
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
            Así funciona la experiencia Instant 80: nivel máximo, equipamiento rápido y todo el endgame de WotLK con Crossfaction en raids y BGs.
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
