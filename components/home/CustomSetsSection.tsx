'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const sets = [
  {
    name: 'Set Aspirante',
    tier: 'T1',
    description: 'El primer set custom argentino. Para los que recién comienzan el endgame. Stats balanceados para PvP y PvE inicial.',
    color: '#75C7FF',
    glow: 'rgba(117,199,255,0.3)',
    cost: '50 Monedas',
    pieces: 5,
  },
  {
    name: 'Campeón Argentina',
    tier: 'T2',
    description: 'Set intermedio con diseño inspirado en los colores nacionales. Para el guerrero que ya demostró de qué está hecho.',
    color: '#E8F4FF',
    glow: 'rgba(232,244,255,0.3)',
    cost: '150 Monedas',
    pieces: 5,
    featured: true,
  },
  {
    name: 'Gladiador Argentina',
    tier: 'T3',
    description: 'El set más poderoso del servidor. Solo para los mejores gladiadores. Diseño único con corona de hielo argentina.',
    color: '#FFD700',
    glow: 'rgba(255,215,0,0.3)',
    cost: '400 Monedas',
    pieces: 5,
  },
]

export function CustomSetsSection() {
  return (
    <section className="relative z-10 py-24 px-4 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-4">
            <Star className="w-4 h-4" /> Exclusivo WoW Argentina
          </div>
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Sets{' '}
            <span style={{
              background: 'linear-gradient(135deg, #FFD700, #FFF8E1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Custom Argentinos
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Equipamiento exclusivo diseñado para WoW Argentina. Comprá con Moneda Argentina en nuestra tienda.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sets.map((set, i) => (
            <motion.div
              key={set.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`relative rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 ${
                set.featured
                  ? 'bg-gradient-to-b from-slate-800/80 to-slate-900/80 border-white/20'
                  : 'bg-slate-900/50 border-slate-700/50'
              }`}
              style={set.featured ? {
                boxShadow: `0 0 40px rgba(232,244,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)`
              } : undefined}
            >
              {set.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-slate-900 text-xs font-bold tracking-widest uppercase">
                  Más Popular
                </div>
              )}

              {/* Tier badge */}
              <div
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-4 border"
                style={{
                  color: set.color,
                  borderColor: set.color + '40',
                  backgroundColor: set.color + '10',
                }}
              >
                {set.tier}
              </div>

              {/* Placeholder de equipo */}
              <div
                className="w-full h-40 rounded-xl mb-4 flex items-center justify-center border"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${set.glow} 0%, transparent 70%)`,
                  borderColor: set.color + '20',
                }}
              >
                <div
                  className="font-['Cinzel'] font-black text-3xl opacity-30"
                  style={{ color: set.color }}
                >
                  {set.tier}
                </div>
              </div>

              <h3
                className="font-['Cinzel'] font-bold text-xl mb-2"
                style={{ color: set.color }}
              >
                {set.name}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{set.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Precio</div>
                  <div
                    className="font-['Cinzel'] font-bold"
                    style={{ color: set.color }}
                  >
                    {set.cost}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-1">Piezas</div>
                  <div className="text-white font-bold">{set.pieces} items</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
