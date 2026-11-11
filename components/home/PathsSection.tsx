'use client'

import { motion } from 'framer-motion'
import { Zap, Swords, Snowflake } from 'lucide-react'
import Link from 'next/link'

const paths = [
  {
    num: '01',
    Icon: Zap,
    accent: '#F6B40E',
    glow: 'rgba(246, 180, 14,0.18)',
    bgGlow: 'rgba(246, 180, 14,0.04)',
    borderHover: 'rgba(246, 180, 14,0.4)',
    title: 'Instant 80',
    subtitle: 'Tu aventura comienza al máximo nivel.',
    desc: 'Alcanzá instantáneamente el nivel 80 y preparate para disfrutar del contenido endgame de Wrath of the Lich King. Equipate rápidamente y empezá a competir sin largas horas de leveo.',
    tags: ['Nivel 80', 'Equipamiento rápido', 'Endgame'],
    cta: 'Creá tu cuenta',
    featured: true,
  },
  {
    num: '02',
    Icon: Swords,
    accent: '#FF6B4A',
    glow: 'rgba(255,107,74,0.18)',
    bgGlow: 'rgba(255,107,74,0.04)',
    borderHover: 'rgba(255,107,74,0.4)',
    title: 'PvP & Crossfaction',
    subtitle: 'Competí sin límites de facción.',
    desc: 'Disfrutá de arenas y campos de batalla con Crossfaction habilitado en BGs. Luchá por la victoria y poné a prueba tu habilidad frente a otros jugadores.',
    tags: ['Battlegrounds', 'Arenas', 'Crossfaction'],
    cta: 'Creá tu cuenta',
  },
  {
    num: '03',
    Icon: Snowflake,
    accent: '#75C7FF',
    glow: 'rgba(117,199,255,0.18)',
    bgGlow: 'rgba(117,199,255,0.04)',
    borderHover: 'rgba(117,199,255,0.4)',
    title: 'Raids & PvE',
    subtitle: 'Conquistá los desafíos de Rasganorte.',
    desc: 'Enfrentate a los desafíos de WotLK, participá en raids como Ciudadela de la Corona de Hielo y disfrutá de contenido PvE con Crossfaction habilitado para raids.',
    tags: ['ICC', 'Raids', 'PvE', 'Crossfaction'],
    cta: 'Creá tu cuenta',
  },
]

export function PathsSection() {
  return (
    <section className="relative z-10 py-20 md:py-28 px-4">
      {/* Subtle bg tint */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(10,20,50,0.5) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.18)', color: '#75C7FF' }}>
            <Zap className="w-3.5 h-3.5" /> Modalidad Instant 80
          </div>
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            WoW Argentina,{' '}
            <span style={{ background: 'linear-gradient(135deg, #75C7FF, #FFFFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Instant 80
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Alcanzá el nivel máximo, equipate rápidamente y preparate para conquistar Rasganorte. Disfrutá del PvP y PvE de WotLK 3.3.5a con Crossfaction, raids, arenas y campos de batalla.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {paths.map((p, i) => (
            <motion.div key={p.num}
              initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: i * 0.1 }}
              whileHover={{ y: -8, scale: 1.01 }}
              className="group relative rounded-2xl p-6 flex flex-col transition-all duration-300 cursor-pointer"
              style={{
                background: p.featured
                  ? `linear-gradient(160deg, rgba(246, 180, 14,0.06) 0%, rgba(10,20,40,0.85) 60%)`
                  : 'rgba(10,20,40,0.65)',
                border: `1px solid ${p.featured ? 'rgba(246, 180, 14,0.2)' : 'rgba(117,199,255,0.1)'}`,
                backdropFilter: 'blur(14px)',
              }}
            >
              {/* Background large number */}
              <div className="absolute top-4 right-5 font-['Cinzel'] font-black select-none pointer-events-none"
                style={{ fontSize: '6rem', lineHeight: 1, color: p.accent, opacity: 0.04 }}>
                {p.num}
              </div>

              {/* Featured badge */}
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase"
                  style={{ background: 'linear-gradient(135deg, #F6B40E, #b45309)', color: '#050A14' }}>
                  Modalidad oficial
                </div>
              )}

              {/* Glow overlay on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${p.bgGlow}, transparent)` }} />

              {/* Number badge */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-5 font-['Cinzel'] font-black text-sm flex-shrink-0"
                style={{ background: `${p.accent}12`, border: `1px solid ${p.accent}30`, color: p.accent }}>
                {p.num}
              </div>

              {/* Icon circle */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
                style={{ background: `${p.accent}10`, border: `1px solid ${p.accent}25` }}>
                <p.Icon className="w-7 h-7" style={{ color: p.accent }} />
              </div>

              <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-1">{p.title}</h3>
              <p className="text-sm font-medium mb-3" style={{ color: p.accent }}>{p.subtitle}</p>
              <p className="text-slate-400 text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {p.tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: `${p.accent}10`, border: `1px solid ${p.accent}25`, color: p.accent }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <Link href="/register" className="mt-auto">
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group-hover:pl-5"
                  style={{
                    background: `${p.accent}0d`,
                    border: `1px solid ${p.accent}22`,
                    color: p.accent,
                  }}>
                  <span>{p.cta}</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
          className="text-center mt-12">
          <Link href="/download">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-3 rounded-xl font-['Cinzel'] font-semibold text-sm transition-all"
              style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.2)', color: '#75C7FF' }}>
              Guía de inicio rápido →
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Section divider */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(117,199,255,0.12), transparent)' }} />
    </section>
  )
}
