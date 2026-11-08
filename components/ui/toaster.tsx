'use client'

import { Toaster as SonnerToaster, toast } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, X, type LucideIcon } from 'lucide-react'

type Kind = 'success' | 'error' | 'warning' | 'info'

const STYLE: Record<Kind, { icon: LucideIcon; color: string; glow: string; fallback: string }> = {
  success: { icon: CheckCircle2, color: '#4ade80', glow: 'rgba(74,222,128,0.18)', fallback: 'Acción completada con éxito' },
  error: { icon: XCircle, color: '#f87171', glow: 'rgba(248,113,113,0.18)', fallback: 'No se pudo completar la operación' },
  warning: { icon: AlertTriangle, color: '#F6B40E', glow: 'rgba(246,180,14,0.18)', fallback: 'Atención' },
  info: { icon: Info, color: '#74ACDF', glow: 'rgba(116,172,223,0.2)', fallback: 'Información' },
}

const DURATION: Record<Kind, number> = { success: 4500, info: 5000, warning: 6500, error: 7500 }

function NotifyCard({ id, kind, title, description }: { id: string | number; kind: Kind; title: string; description?: string }) {
  const { icon: Icon, color, glow } = STYLE[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className="relative w-[calc(100vw-2rem)] sm:w-[380px] overflow-hidden rounded-2xl border bg-[#0A1628]/95 backdrop-blur-md p-4 pr-10 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]"
      style={{ borderColor: `${color}55`, boxShadow: `0 0 0 1px ${color}14, 0 18px 50px -12px rgba(0,0,0,0.7), 0 0 40px -10px ${glow}` }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1f`, color }}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-white break-words">{title}</p>
          {description && <p className="mt-0.5 text-[13px] leading-snug text-slate-300 break-words">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => toast.dismiss(id)}
        className="absolute top-3 right-3 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function show(kind: Kind, title?: string, description?: string) {
  return toast.custom(id => <NotifyCard id={id} kind={kind} title={title || STYLE[kind].fallback} description={description} />, {
    duration: DURATION[kind],
  })
}

/**
 * App-wide notifications. Call success() only after the backend confirmed the operation,
 * and never pass raw server/SQL errors — use the API's user-facing `error` message.
 */
export const notify = {
  success: (title?: string, description?: string) => show('success', title, description),
  error: (title?: string, description?: string) => show('error', title, description),
  warning: (title?: string, description?: string) => show('warning', title, description),
  info: (title?: string, description?: string) => show('info', title, description),
  dismiss: (id?: string | number) => toast.dismiss(id),
}

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      visibleToasts={4}
      gap={10}
      offset={{ top: 84, right: 20 }}
      mobileOffset={{ top: 76, left: 16, right: 16 }}
      toastOptions={{ unstyled: true }}
    />
  )
}
