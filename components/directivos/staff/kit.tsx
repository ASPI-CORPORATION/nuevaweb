'use client'

import { useEffect, useId, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X, Users, Network, BarChart3, History, Shield } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { Pill } from '@/components/gm/ui'
import {
  rankByKey, MEMBER_STATUS_COLOR, MEMBER_STATUS_LABEL, DIVISION_ROLE_LABEL,
  type DivisionRole, type MemberStatus,
} from '@/lib/staff/ranks'

export function RankBadge({ rank, gmlevel, compact }: { rank: string | null | undefined; gmlevel?: number; compact?: boolean }) {
  const r = rankByKey(rank)
  if (!r) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/10 text-slate-400 whitespace-nowrap">
        {gmlevel ? `Sin rango · GM ${gmlevel}` : 'Sin rango'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ color: r.color, borderColor: `${r.color}55`, background: `${r.color}14` }}>
      {!compact && <Shield className="w-3 h-3" aria-hidden="true" />}{r.name}
    </span>
  )
}

export function StatusPill({ status }: { status: MemberStatus }) {
  return <Pill color={MEMBER_STATUS_COLOR[status]}>{MEMBER_STATUS_LABEL[status]}</Pill>
}

export function DivisionChip({ name, color, role }: { name: string; color: string; role?: DivisionRole }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-200 max-w-full">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="truncate">{name}</span>
      {role && role !== 'miembro' && <span className="text-slate-500 shrink-0">· {DIVISION_ROLE_LABEL[role]}</span>}
    </span>
  )
}

const SUBNAV = [
  { href: '/directivos/staff', label: 'Miembros', icon: Users, exact: true },
  { href: '/directivos/staff/divisiones', label: 'Divisiones', icon: Network },
  { href: '/directivos/staff/rendimiento', label: 'Rendimiento', icon: BarChart3 },
  { href: '/directivos/staff/historial', label: 'Historial', icon: History },
]

export function StaffSubnav() {
  const path = usePathname()
  return (
    <nav aria-label="Secciones de Staff" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1.5 px-1 pb-1 min-w-max">
        {SUBNAV.map(l => {
          const active = l.exact ? path === l.href : path.startsWith(l.href)
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${active ? 'bg-[#F6B40E] text-[#050A14] border-[#F6B40E]' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
                <l.icon className="w-4 h-4" aria-hidden="true" /> {l.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Responsive dialog: bottom sheet on phones, centered card from sm up. */
export function Sheet({ open, title, subtitle, onClose, busy, children, footer, wide, tone = 'gold' }: {
  open: boolean; title: string; subtitle?: React.ReactNode; onClose: () => void; busy?: boolean
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; tone?: 'gold' | 'danger' | 'celeste'
}) {
  const reduce = useReducedMotion()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 50)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; clearTimeout(t) }
  }, [open, busy, onClose])
  const border = tone === 'danger' ? 'border-red-500/30' : tone === 'celeste' ? 'border-[#74ACDF]/30' : 'border-[#F6B40E]/25'
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} />
          <motion.div ref={panel}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border ${border} bg-[#0A1628] shadow-2xl`}>
            <div className="flex items-start gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-white/5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-['Cinzel'] font-bold text-lg text-white break-words">{title}</h2>
                {subtitle && <div className="text-xs text-slate-400 mt-0.5 break-words">{subtitle}</div>}
              </div>
              <button data-close onClick={onClose} disabled={busy} className="p-2 -m-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 overflow-y-auto overscroll-contain">{children}</div>
            {footer && <div className="px-4 sm:px-6 py-3 border-t border-white/5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="block min-w-0">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0 text-sm">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-white text-right min-w-0 break-words">{children}</span>
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return <div className="mt-3 px-3.5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">{message}</div>
}

export interface ActionResult {
  ok: boolean; status: number
  data: { error?: string; title?: string; message?: string; applyNote?: string | null; notes?: string[]; needsConfirm?: boolean; denied?: boolean; verified?: boolean }
}

/** Sends the request and shows the toast ONLY from the backend's real answer. */
export async function runAction(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<ActionResult> {
  let res: Response
  try {
    res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    notify.error('Sin conexión', 'No se pudo contactar al servidor. No se aplicó ningún cambio.')
    return { ok: false, status: 0, data: { error: 'No se pudo contactar al servidor.' } }
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 403) notify.error('Acceso denegado', 'No tenés autorización para modificar a este miembro.')
    else if (res.status !== 428) notify.error('No se pudo completar la acción', data.error)
    return { ok: false, status: res.status, data }
  }
  notify.success(data.title ?? 'Listo', data.message)
  if (data.applyNote) notify.info('Permisos en el juego', data.applyNote)
  for (const n of data.notes ?? []) notify.info('Aviso', n)
  if (data.verified === false) notify.warning('Verificación pendiente', 'El cambio se guardó, pero la relectura de AzerothCore no coincidió. Revisá el expediente.')
  return { ok: true, status: res.status, data }
}

export const selectCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none bg-[#0b1626]'
export const textareaCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-y min-h-[84px]'
