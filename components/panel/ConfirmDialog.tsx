'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  danger?: boolean
  /** Gold warning look (e.g. revoking access) instead of the red danger icon */
  warning?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, warning, busy, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onCancel()} />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={`relative w-full max-w-md rounded-2xl border bg-[#0A1628] p-6 shadow-2xl ${warning ? 'border-[#F6B40E]/30' : danger ? 'border-red-500/25' : 'border-white/10'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${warning ? 'bg-[#F6B40E]/12 text-[#F6B40E]' : danger ? 'bg-red-500/10 text-red-400' : 'bg-[#74ACDF]/10 text-[#74ACDF]'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-['Cinzel'] font-bold text-lg text-white">{title}</h2>
                <div className="mt-1 text-sm text-slate-400 break-words">{message}</div>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button onClick={onCancel} disabled={busy} className="btn-ghost">Cancelar</button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className={danger
                  ? 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60'
                  : 'btn-primary'}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
