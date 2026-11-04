'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

export function DiscordSection() {
  return (
    <section className="relative z-10 py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-indigo-950/60 via-slate-900/60 to-purple-950/60 rounded-3xl border border-indigo-500/20 p-12 overflow-hidden"
        >
          {/* Glow fondo */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Users className="w-7 h-7 text-indigo-400" />
              </div>
            </div>

            <h2 className="font-['Cinzel'] font-black text-4xl text-white mb-4">
              Unite a la Comunidad
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
              Miles de jugadores argentinos te están esperando en Discord. Organizá raids, armá arenas, conseguí ayuda y más.
            </p>

            <a
              href={process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/wowargentina'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-['Cinzel'] font-semibold text-lg rounded-xl shadow-lg shadow-indigo-500/20 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Unirse al Discord
              </motion.button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
