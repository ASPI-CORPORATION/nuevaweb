'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

export const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: 'no-store' })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(d.error || `Error ${r.status}`), { status: r.status })
  return d
}

export function fmtDate(v: string | Date | null | undefined, withTime = true) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtAgo(v: string | Date | null | undefined) {
  if (!v) return '—'
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000)
  if (s < 60) return 'hace instantes'
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86400)} días`
}

export function flag(code: string | null | undefined) {
  if (!code || code.length !== 2) return '🏳️'
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="min-w-0">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white mt-1 break-words">{title}</h1>
        {description && <p className="text-sm text-slate-400 mt-1 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function StatCard({ icon: Icon, label, value, hint, color = '#74ACDF' }: {
  icon: LucideIcon; label: string; value: React.ReactNode; hint?: string; color?: string
}) {
  return (
    <div className="panel-card p-4 relative overflow-hidden" style={{ borderColor: `${color}33` }}>
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: color }} aria-hidden="true" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
        <Icon className="w-4 h-4" style={{ color }} /> {label}
      </div>
      <div className="mt-2 font-['Cinzel'] font-black text-2xl sm:text-3xl text-white">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </div>
  )
}

export function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      {children}
    </span>
  )
}

export const STATUS_COLOR: Record<string, string> = {
  Abierto: '#74ACDF', Aceptado: '#a78bfa', 'En Revisión': '#F6B40E', Rechazado: '#f87171', Cerrado: '#94a3b8',
}
export const PRIORITY_COLOR: Record<string, string> = { Baja: '#94a3b8', Normal: '#74ACDF', Alta: '#fb923c', Urgente: '#f87171' }

export function TicketStatus({ status }: { status: string }) {
  return <Pill color={STATUS_COLOR[status] ?? '#94a3b8'}>{status === 'En Revisión' ? 'En revisión' : status}</Pill>
}
export function Priority({ priority }: { priority: string }) {
  return <Pill color={PRIORITY_COLOR[priority] ?? '#74ACDF'}>{priority}</Pill>
}

export function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${online ? 'text-green-400' : 'text-slate-500'}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-slate-600'}`} />
      {online ? 'En línea' : 'Desconectado'}
    </span>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, text }: { icon?: LucideIcon; title: string; text?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[#74ACDF]/10 border border-[#74ACDF]/20 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-[#74ACDF]/70" />
      </div>
      <p className="text-white font-semibold">{title}</p>
      {text && <p className="text-sm text-slate-400 mt-1">{text}</p>}
    </div>
  )
}

export function Skeletons({ rows = 4, h = 'h-16' }: { rows?: number; h?: string }) {
  return <div className="space-y-2 p-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className={`${h} skeleton`} />)}</div>
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">
      {error instanceof Error ? error.message : 'No se pudo cargar la información.'}
    </div>
  )
}

export const inputCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none'
