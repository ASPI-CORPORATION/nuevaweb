'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: Kind; message: string }

let seq = 0
let toasts: Toast[] = []
const listeners = new Set<(t: Toast[]) => void>()

function emit() { for (const l of listeners) l(toasts) }

function push(kind: Kind, message: string, ms = kind === 'error' ? 7000 : 4000) {
  const t = { id: ++seq, kind, message }
  toasts = [...toasts.slice(-3), t]
  emit()
  setTimeout(() => dismiss(t.id), ms)
}

function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

export const notify = {
  success: (m: string) => push('success', m),
  error: (m: string) => push('error', m),
  info: (m: string) => push('info', m),
}

const STYLE: Record<Kind, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: '#4ade80' },
  error: { icon: AlertTriangle, color: '#f87171' },
  info: { icon: Info, color: '#74ACDF' },
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    listeners.add(setItems)
    return () => { listeners.delete(setItems) }
  }, [])

  return (
    <div
      className="fixed z-[200] top-20 inset-x-4 sm:top-auto sm:bottom-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {items.map(t => {
          const { icon: Icon, color } = STYLE[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#0A1628]/95 backdrop-blur-md px-4 py-3 shadow-2xl"
              style={{ borderColor: `${color}55` }}
            >
              <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color }} />
              <p className="flex-1 text-sm text-slate-100 break-words">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-white" aria-label="Cerrar notificación">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
