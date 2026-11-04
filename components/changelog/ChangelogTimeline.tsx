'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Change {
  type: string
  text: string
}

interface ChangelogEntry {
  id: number
  version: string
  title: string
  date: string
  changes: string
  type: string
}

const changeTypeBadge: Record<string, string> = {
  'NUEVO': 'bg-green-500/15 text-green-400 border-green-500/30',
  'FIX': 'bg-red-500/15 text-red-400 border-red-500/30',
  'BALANCE': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'EVENTO': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'MEJORA': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'ELIMINADO': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const versionTypeBadge: Record<string, string> = {
  'Mayor': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'Menor': 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  'Hotfix': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
}

export function ChangelogTimeline({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-blue-500/20 to-transparent" />

      <div className="space-y-8">
        {entries.map((entry, i) => {
          let changes: Change[] = []
          try {
            changes = JSON.parse(entry.changes)
          } catch {
            changes = []
          }

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-16"
            >
              {/* Dot */}
              <div className="absolute left-4 top-1.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-blue-500/60 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>

              {/* Card */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  <span className="font-['Cinzel'] font-bold text-xl text-white">{entry.version}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${versionTypeBadge[entry.type] || versionTypeBadge.Menor}`}>
                    {entry.type}
                  </span>
                  <span className="text-sm text-slate-400 ml-auto">
                    {format(new Date(entry.date), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>

                <h3 className="text-white font-semibold mb-4">{entry.title}</h3>

                <ul className="space-y-2.5">
                  {changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded border font-bold mt-0.5 ${changeTypeBadge[change.type] || changeTypeBadge.FIX}`}>
                        {change.type}
                      </span>
                      <span className="text-slate-300 text-sm leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
