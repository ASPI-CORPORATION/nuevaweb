'use client'

import { motion } from 'framer-motion'
import { Zap, Flame, Shield } from 'lucide-react'
import Link from 'next/link'

const paths = [
  {
    icon: Shield,
    iconColor: '#75C7FF',
    title: 'Aventurero Blizzlike',
    subtitle: 'El camino clásico, agilizado',
    description:
      'Viví la experiencia original de WoW WotLK con rates optimizados para Argentina. Leveo con Sets de Leveo exclusivos que aceleran tu progreso sin quitarte la experiencia del juego. Dungeons, raids, PvP, todo como Blizzard lo pensó.',
    tags: ['x2 XP', 'Sets de Leveo', 'Blizzlike+', 'PvP/PvE'],
    color: 'blue',
    delay: 0.1,
  },
  {
    icon: Zap,
    iconColor: '#FFD700',
    title: 'Instant 80',
    subtitle: 'Directo al endgame',
    description:
      'No perdés tiempo leveleando. Creás el personaje, ya sos nivel 80, con gear inicial, listo para meterte de lleno en arenas, battlegrounds y raids. Perfecto para los que quieren puro contenido de alto nivel desde el primer momento.',
    tags: ['Nivel 80', 'Gear Inicial', 'Arenas', 'Raids Instant'],
    color: 'gold',
    delay: 0.2,
  },
  {
    icon: Flame,
    iconColor: '#FF6B4A',
    title: 'Leveo Rápido',
    subtitle: 'El camino del medio',
    description:
      'NPCs especiales a los niveles 20, 40 y 60 te dan quests, gear y boost de XP. Leveo acelerado pero con contenido a seguir. Llegás al 80 rápido y bien equipado. Con la comunidad más activa del servidor.',
    tags: ['NPCs 20/40/60', 'XP Rápido', 'Quests Custom', 'Gear por zona'],
    color: 'orange',
    delay: 0.3,
  },
]

const colorMap = {
  blue: {
    border: 'hover:border-blue-400/50',
    icon: 'bg-blue-500/10 border-blue-500/20',
    tag: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    glow: 'hover:shadow-[0_0_30px_rgba(117,199,255,0.15)]',
  },
  gold: {
    border: 'hover:border-yellow-400/50',
    icon: 'bg-yellow-500/10 border-yellow-500/20',
    tag: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    glow: 'hover:shadow-[0_0_30px_rgba(255,215,0,0.15)]',
  },
  orange: {
    border: 'hover:border-orange-400/50',
    icon: 'bg-orange-500/10 border-orange-500/20',
    tag: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    glow: 'hover:shadow-[0_0_30px_rgba(255,107,74,0.15)]',
  },
}

export function PathsSection() {
  return (
    <section className="relative z-10 py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Tres Caminos,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #75C7FF, #FFFFFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Tu Elección
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            WoW Argentina es el único servidor con tres formas distintas de jugar. Elegís cómo querés vivir Rasganorte.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {paths.map((path) => {
            const Icon = path.icon
            const colors = colorMap[path.color as keyof typeof colorMap]
            return (
              <motion.div
                key={path.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: path.delay }}
                whileHover={{ y: -6 }}
                className={`group relative bg-slate-900/60 border border-slate-700/50 ${colors.border} ${colors.glow} rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 cursor-pointer`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${colors.icon} border flex items-center justify-center mb-5`}>
                  <Icon className="w-7 h-7" style={{ color: path.iconColor }} />
                </div>

                {/* Text */}
                <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-1">{path.title}</h3>
                <p className="text-sm font-medium mb-3" style={{ color: path.iconColor }}>{path.subtitle}</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{path.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {path.tags.map(tag => (
                    <span key={tag} className={`text-xs px-2 py-1 rounded-full border ${colors.tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Hover border glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${path.iconColor}08, transparent)`,
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-10"
        >
          <Link href="/download">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3 bg-transparent border border-blue-500/40 hover:border-blue-400/70 text-blue-300 hover:text-blue-200 font-['Cinzel'] font-semibold rounded-xl transition-all"
            >
              Cómo empezar a jugar →
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
