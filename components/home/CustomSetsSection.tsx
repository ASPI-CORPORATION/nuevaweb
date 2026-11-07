'use client'

import { motion } from 'framer-motion'
import { Star, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

const sets = [
  {
    name: 'Set Aspirante',
    tier: 'T1',
    rarity: 'Raro',
    color: '#0070DD',
    glow: 'rgba(0,112,221,0.3)',
    bg: 'rgba(0,112,221,0.06)',
    cost: '50 Monedas',
    pieces: 5,
    stats: ['+420 Aguante', '+280 Golpe Crítico', '+195 Resiliencia'],
    desc: 'El primer set custom argentino. Balanceado para PvP y PvE inicial. El punto de entrada al endgame de WoW Argentina.',
    delay: 0.1,
  },
  {
    name: 'Campeón Argentina',
    tier: 'T2',
    rarity: 'Épico',
    color: '#A335EE',
    glow: 'rgba(163,53,238,0.3)',
    bg: 'rgba(163,53,238,0.06)',
    cost: '150 Monedas',
    pieces: 5,
    stats: ['+760 Aguante', '+510 Poder de Hechizos', '+380 Resiliencia'],
    desc: 'Diseño inspirado en los colores nacionales. Para el guerrero que ya demostró de qué está hecho en las tierras de Rasganorte.',
    featured: true,
    delay: 0.2,
  },
  {
    name: 'Gladiador Argentina',
    tier: 'T3',
    rarity: 'Legendario',
    color: '#FF8000',
    glow: 'rgba(255,128,0,0.3)',
    bg: 'rgba(255,128,0,0.06)',
    cost: '400 Monedas',
    pieces: 5,
    stats: ['+1240 Aguante', '+890 Poder de Ataque', '+640 Resiliencia'],
    desc: 'El set más poderoso del servidor. Solo para los mejores gladiadores. Diseño único con corona de hielo argentina.',
    delay: 0.3,
  },
]

const RARITY_BADGE = {
  Raro: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  Épico: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  Legendario: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
}

export function CustomSetsSection() {
  return (
    <section className="relative z-10 py-20 md:py-28 px-4"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(10,15,30,0.5), transparent)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(246, 180, 14,0.08)', border: '1px solid rgba(246, 180, 14,0.2)', color: '#F6B40E' }}>
            <Star className="w-3.5 h-3.5" /> Exclusivo WoW Argentina
          </div>
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Sets{' '}
            <span style={{ background: 'linear-gradient(135deg, #F6B40E, #FFF8E1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Custom Argentinos
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Equipamiento de diseño exclusivo creado para WoW Argentina. Tres niveles de poder, un solo objetivo: dominar Rasganorte.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sets.map((s) => (
            <motion.div key={s.name}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: s.delay }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative rounded-2xl flex flex-col transition-all duration-300"
              style={{
                background: s.featured
                  ? `linear-gradient(160deg, rgba(163,53,238,0.1) 0%, rgba(10,15,35,0.9) 60%)`
                  : 'rgba(10,15,35,0.7)',
                border: `1px solid ${s.featured ? 'rgba(163,53,238,0.3)' : 'rgba(117,199,255,0.08)'}`,
                backdropFilter: 'blur(14px)',
              }}
            >
              {s.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full text-xs font-black tracking-widest uppercase"
                  style={{ background: 'linear-gradient(135deg, #A335EE, #7c3aed)', color: '#fff', boxShadow: '0 0 20px rgba(163,53,238,0.5)' }}>
                  ★ Más Popular
                </div>
              )}

              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${s.bg}, transparent)` }} />

              {/* Visual display area */}
              <div className="relative h-44 rounded-t-2xl overflow-hidden flex items-center justify-center m-2 mb-0 rounded-xl"
                style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${s.glow} 0%, rgba(5,10,20,0.9) 70%)` }}>
                {/* Tier display */}
                <div className="text-center">
                  <div className="font-['Cinzel'] font-black mb-2"
                    style={{ fontSize: '5rem', color: s.color, opacity: 0.15, lineHeight: 1 }}>{s.tier}</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="font-['Cinzel'] font-black text-6xl" style={{ color: s.color, opacity: 0.6, filter: `drop-shadow(0 0 30px ${s.color})` }}>
                      ⚔
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${RARITY_BADGE[s.rarity as keyof typeof RARITY_BADGE]}`}>
                    {s.rarity}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                    style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, color: s.color }}>
                    {s.tier}
                  </span>
                </div>

                <h3 className="font-['Cinzel'] font-bold text-xl mb-1.5" style={{ color: s.color }}>{s.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{s.desc}</p>

                {/* Stats */}
                <div className="space-y-1.5 mb-5">
                  {s.stats.map(st => (
                    <div key={st} className="flex items-center gap-2 text-xs" style={{ color: '#4ade80' }}>
                      <span style={{ color: 'rgba(74,222,128,0.4)' }}>▸</span>
                      {st}
                    </div>
                  ))}
                </div>

                {/* Price + CTA */}
                <div className="mt-auto flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Precio</div>
                    <div className="font-['Cinzel'] font-bold" style={{ color: s.color }}>{s.cost}</div>
                  </div>
                  <Link href="/shop">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: `${s.color}12`, border: `1px solid ${s.color}30`, color: s.color }}>
                      <ShoppingBag className="w-3.5 h-3.5" /> Comprar
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(246, 180, 14,0.1), transparent)' }} />
    </section>
  )
}
