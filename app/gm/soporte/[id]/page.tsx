'use client'

import { use, useCallback, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, UserCheck, Eye, XCircle, CheckCircle2, RotateCcw, Loader2, Settings2, ExternalLink } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { TicketChat } from '@/components/tickets/TicketChat'
import type { TicketLiveStatus } from '@/components/tickets/useTicketStream'
import { TemplateManager } from '@/components/gm/TemplateManager'
import { fetcher, fmtDate, TicketStatus, Priority, ErrorBox, Skeletons, inputCls } from '@/components/gm/ui'

export default function GmTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const ticketId = Number(id)
  const { data, error, mutate } = useSWR(`/api/gm/tickets/${ticketId}`, fetcher)
  const { data: tpl, mutate: reloadTpl } = useSWR(`/api/gm/templates?ticket=${ticketId}`, fetcher)
  const { data: inbox } = useSWR(data?.viewer?.tier >= 3 ? '/api/gm/tickets?status=Cerrado&q=0' : null, fetcher)
  const [live, setLive] = useState<TicketLiveStatus | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'reject' | 'close'>(null)
  const [modalText, setModalText] = useState('')
  const [tplOpen, setTplOpen] = useState(false)
  const onLive = useCallback((s: TicketLiveStatus) => setLive(s), [])

  if (error) return <ErrorBox error={error} />
  if (!data) return <Skeletons rows={6} h="h-20" />

  const t = data.ticket
  const viewer = data.viewer as { id: number; username: string; tier: number }
  const status = live?.status ?? t.status
  const assignedName = live ? live.assignedTo : t.assigned_name
  const priority = live?.priority ?? t.priority
  const final = status === 'Cerrado' || status === 'Rechazado'
  const mine = assignedName === viewer.username
  const heldByOther = !!assignedName && !mine
  const canWrite = !final && (!heldByOther || viewer.tier >= 3)

  const act = async (body: Record<string, unknown>, key: string) => {
    setBusy(key)
    try {
      const res = await fetch(`/api/gm/tickets/${ticketId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { notify.error(res.status === 409 ? 'Ticket no disponible' : 'No se pudo completar la operación', d.error); return false }
      const titles: Record<string, string> = { accept: 'Ticket aceptado', review: 'Ticket en revisión', reject: 'Ticket rechazado', close: 'Ticket cerrado', reopen: 'Ticket reabierto', priority: 'Prioridad actualizada', reassign: 'Ticket reasignado' }
      notify.success(titles[key] ?? 'Acción completada con éxito', d.message)
      mutate()
      return true
    } catch {
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const closeTpl = (tpl?.templates as Array<{ label: string; filled: string }> | undefined)?.find(x => x.label === 'Cerrar ticket')?.filled ?? ''
  const rejectTpl = (tpl?.templates as Array<{ label: string; filled: string }> | undefined)?.find(x => x.label === 'Rechazar solicitud')?.filled ?? ''

  const btn = (key: string, label: string, Icon: typeof Eye, onClick: () => void, cls: string, disabled = false) => (
    <button onClick={onClick} disabled={!!busy || disabled} className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide disabled:opacity-40 ${cls}`}>
      {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <Link href="/gm/soporte" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Centro de soporte</Link>

      <header className="panel-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-[#F6B40E] font-bold">#{t.id}</span>
          <TicketStatus status={status} /><Priority priority={priority} />
          <span className="text-xs text-slate-500">{t.category}</span>
        </div>
        <h1 className="font-['Cinzel'] font-bold text-xl sm:text-2xl text-white break-words">{t.subject}</h1>
        <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>Jugador: <Link href={`/gm/cuentas/${t.account_id}`} className="text-[#74ACDF] hover:underline">{t.account_name} <ExternalLink className="w-3 h-3 inline" /></Link></span>
          <span>Personaje: <span className="text-slate-200">{t.character_name ?? '—'}</span></span>
          <span>Creado: {fmtDate(t.created_at)}</span>
          <span>GM: <span className={mine ? 'text-green-400' : 'text-slate-200'}>{assignedName ?? 'Sin asignar'}{mine ? ' (vos)' : ''}</span></span>
        </div>
        {status === 'Rechazado' && (live?.rejectedReason ?? t.rejected_reason) && (
          <p className="mt-2 text-sm text-red-300">Motivo del rechazo: {live?.rejectedReason ?? t.rejected_reason}</p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <TicketChat
          ticketId={ticketId}
          mode="gm"
          initial={data.messages}
          detailUrl={`/api/gm/tickets/${ticketId}`}
          sendUrl={`/api/gm/tickets/${ticketId}`}
          buildBody={message => ({ action: 'reply', message })}
          canWrite={canWrite}
          closedNotice={final ? 'Ticket cerrado. Reabrilo para responder.' : `Asignado a ${assignedName}. Solo ese GM o un GM nivel 3 puede responder.`}
          quickReplies={tpl?.templates}
          onLiveStatus={onLive}
        />

        <aside className="space-y-3">
          <div className="panel-card p-4 space-y-2">
            <h2 className="text-sm font-semibold text-white mb-1">Acciones</h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {!final && !mine && btn('accept', heldByOther ? 'Tomado' : 'Aceptar', UserCheck, () => act({ action: 'accept' }, 'accept'), 'bg-[#74ACDF] text-[#050A14]', heldByOther)}
              {!final && btn('review', 'En revisión', Eye, () => act({ action: 'review' }, 'review'), 'border border-[#F6B40E]/40 text-[#ffe08a] bg-[#F6B40E]/10', heldByOther && viewer.tier < 3 || status === 'En Revisión')}
              {!final && btn('reject', 'Rechazar', XCircle, () => { setModalText(rejectTpl); setModal('reject') }, 'border border-red-500/40 text-red-300 bg-red-500/10', heldByOther && viewer.tier < 3)}
              {!final && btn('close', 'Cerrar', CheckCircle2, () => { setModalText(closeTpl); setModal('close') }, 'bg-green-600 text-white', heldByOther && viewer.tier < 3)}
              {final && btn('reopen', 'Reabrir', RotateCcw, () => act({ action: 'reopen' }, 'reopen'), 'border border-white/15 text-slate-200', heldByOther && viewer.tier < 3)}
            </div>
            <label className="block pt-2">
              <span className="text-xs text-slate-400">Prioridad</span>
              <select value={priority} disabled={!!busy || final} onChange={e => act({ action: 'priority', priority: e.target.value }, 'priority')} className={`${inputCls} mt-1`}>
                {['Baja', 'Normal', 'Alta', 'Urgente'].map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            {viewer.tier >= 3 && (
              <label className="block">
                <span className="text-xs text-slate-400">Reasignar (GM nivel 3)</span>
                <select value="" disabled={!!busy} onChange={e => act({ action: 'reassign', gmAccountId: e.target.value === 'none' ? null : Number(e.target.value) }, 'reassign')} className={`${inputCls} mt-1`}>
                  <option value="" disabled>Elegir GM…</option>
                  <option value="none">Liberar (sin asignar)</option>
                  {(inbox?.gms ?? []).map((g: { id: number; username: string }) => <option key={g.id} value={g.id}>{g.username}</option>)}
                </select>
              </label>
            )}
          </div>
          {viewer.tier >= 3 && (
            <button onClick={() => setTplOpen(true)} className="btn-ghost w-full"><Settings2 className="w-4 h-4" /> Gestionar plantillas</button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={!!modal}
        danger={modal === 'reject'}
        title={modal === 'reject' ? 'Rechazar ticket' : 'Cerrar ticket'}
        message={
          <div className="space-y-2">
            <p>{modal === 'reject' ? 'Escribí el motivo del rechazo; el jugador lo verá en el ticket.' : 'Mensaje final para el jugador (opcional).'}</p>
            <textarea value={modalText} onChange={e => setModalText(e.target.value)} rows={4} maxLength={modal === 'reject' ? 500 : 4000} className={`${inputCls} resize-y`} aria-label="Mensaje" />
          </div>
        }
        confirmLabel={modal === 'reject' ? 'Rechazar' : 'Cerrar ticket'}
        busy={!!busy}
        onConfirm={async () => {
          const ok = modal === 'reject'
            ? await act({ action: 'reject', reason: modalText }, 'reject')
            : await act({ action: 'close', message: modalText }, 'close')
          if (ok) setModal(null)
        }}
        onCancel={() => setModal(null)}
      />
      <TemplateManager open={tplOpen} onClose={() => setTplOpen(false)} onChanged={() => reloadTpl()} />
    </div>
  )
}
