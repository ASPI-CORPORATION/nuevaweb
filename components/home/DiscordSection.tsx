'use client'

import { motion } from 'framer-motion'
import { Users, Bell, Headphones, Mic, MessageCircle, Shield, Zap, Hash } from 'lucide-react'

const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/wowargentina'

const features = [
  { Icon: Bell, title: 'Eventos en vivo', desc: 'Notificaciones de eventos, raids y torneos en tiempo real.' },
  { Icon: Headphones, title: 'Soporte directo', desc: 'Canales de tickets y soporte atendidos por el staff.' },
  { Icon: Mic, title: 'Canales de voz', desc: 'Coordina raids y arenas con tu grupo en voz.' },
  { Icon: Zap, title: 'Noticias primero', desc: 'Enteráte de actualizaciones antes que nadie.' },
  { Icon: Hash, title: 'Clases y builds', desc: 'Canales por clase, estrategias y análisis de builds.' },
  { Icon: Shield, title: 'Comunidad moderada', desc: 'Ambiente sano y sin toxicidad, moderado activamente.' },
]

export function DiscordSection() {
  return (
    <section className="relative z-10 py-20 md:py-28 px-4 overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(8,12,28,0.6), transparent)' }}>

      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: content */}
          <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Comunidad de Discord
            </div>

            <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-5 leading-tight">
              Unite a la{' '}
              <span style={{
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Hermandad
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
              Miles de jugadores argentinos te esperan en nuestro Discord. Estrategias, eventos, soporte y la mejor comunidad de WoW Argentina.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <motion.a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold font-['Cinzel'] text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #5865F2, #7c3aed)',
                  boxShadow: '0 0 32px rgba(88,101,242,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Unirse al Discord
              </motion.a>
              <motion.a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                <Users className="w-4 h-4" /> Ver comunidad
              </motion.a>
            </div>

            {/* Members badge */}
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-500">
              <div className="flex -space-x-1.5">
                {['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500'].map((c, i) => (
                  <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-slate-900`} />
                ))}
              </div>
              <MessageCircle className="w-3.5 h-3.5" />
              Comunidad activa
            </div>
          </motion.div>

          {/* Right: feature grid */}
          <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.07 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="rounded-xl p-4 transition-all duration-200"
                  style={{ background: 'rgba(10,18,42,0.7)', border: '1px solid rgba(99,102,241,0.08)', backdropFilter: 'blur(12px)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <f.Icon className="w-4 h-4" style={{ color: '#818cf8' }} />
                  </div>
                  <h3 className="font-['Cinzel'] font-semibold text-xs text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Discord mock preview */}
            <div className="mt-4 rounded-xl p-4"
              style={{ background: 'rgba(30,27,75,0.5)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400 font-medium">#general — WoW Argentina</span>
              </div>
              {[
                { user: 'Argonath', msg: 'Alguien para arena 3v3? 2.1k rating', color: '#ABD473' },
                { user: 'Keldria', msg: 'Evento raid hoy a las 21hs!', color: '#F58CBA' },
                { user: 'Staff', msg: '¡Bienvenido al servidor WoW Argentina!', color: '#FFD700' },
              ].map(({ user, msg, color }) => (
                <div key={user} className="flex items-start gap-2 py-1">
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>{user}</span>
                  <span className="text-xs text-slate-400 leading-relaxed">{msg}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.15), transparent)' }} />
    </section>
  )
}
