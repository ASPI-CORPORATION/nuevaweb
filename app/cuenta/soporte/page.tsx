'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { MessageSquare, Plus, Loader2, ArrowLeft, LifeBuoy, X } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { TicketChat } from '@/components/tickets/TicketChat'
import { fetcher, fmtAgo, TicketStatus, EmptyState, Skeletons, inputCls } from '@/components/gm/ui'

interface TicketRow { id: number; subject: string; category: string; status: string; created_at: string; last_reply_at: string | null; unread: number; character_name: string | null }

const CATEGORIES = ['Bug', 'Donación', 'Ban', 'Personaje Atascado', 'Tienda', 'Otro']
const FINAL = ['Cerrado', 'Rechazado']

function NewTicketForm({ onCreated, onCancel }: { onCreated: (id: number) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ category: 'Bug', subject: '', message: '', character: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/cuenta/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'No se pudo crear el ticket'); notify.error('No se pudo crear el ticket', d.error); return }
      notify.success('Ticket creado', 'El equipo de soporte te responderá pronto. Vas a ver la respuesta acá mismo.')
      onCreated(d.id)
    } catch {
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="panel-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">Nuevo ticket</h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Cancelar"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-slate-300">Categoría</span>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={`${inputCls} mt-1`}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Personaje (opcional)</span>
          <input value={form.character} onChange={e => setForm({ ...form, character: e.target.value })} maxLength={12} placeholder="Nombre del personaje" className={`${inputCls} mt-1`} />
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-slate-300">Asunto</span>
        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} maxLength={255} required placeholder="Resumí el problema en una línea" className={`${inputCls} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm text-slate-300">Mensaje</span>
        <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={5} maxLength={5000} required placeholder="Contanos qué pasó, cuándo y en qué personaje" className={`${inputCls} mt-1 resize-y`} />
      </label>
      {error && <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">{error}</div>}
      <button type="submit" disabled={loading} className="btn-gold w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear ticket
      </button>
    </form>
  )
}

function TicketView({ id, onBack, onRead }: { id: number; onBack: () => void; onRead: () => void }) {
  const { data, error } = useSWR(`/api/cuenta/tickets/${id}`, fetcher, { revalidateOnFocus: false })
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => { if (data) onRead() }, [data, onRead])
  if (error) return <div className="panel-card p-6 text-sm text-red-300">No pudimos abrir el ticket.</div>
  if (!data) return <Skeletons rows={4} h="h-24" />
  const t = data.ticket
  const current = status ?? t.status
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="lg:hidden p-2 rounded-lg border border-white/10 text-slate-300" aria-label="Volver a mis tickets"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-[#F6B40E]">#{t.id}</span><TicketStatus status={current} /><span className="text-xs text-slate-500">{t.category}</span></div>
          <h2 className="font-['Cinzel'] font-bold text-lg text-white break-words">{t.subject}</h2>
          <p className="text-xs text-slate-400">{t.assigned_name ? `Te atiende el GM ${t.assigned_name}` : 'Esperando a que un GM tome tu solicitud'}</p>
        </div>
      </div>
      <TicketChat
        key={t.id}
        ticketId={t.id}
        mode="player"
        initial={data.messages}
        detailUrl={`/api/cuenta/tickets/${t.id}`}
        sendUrl={`/api/cuenta/tickets/${t.id}`}
        buildBody={message => ({ message })}
        canWrite={!FINAL.includes(current)}
        closedNotice={current === 'Rechazado' ? 'Esta solicitud fue rechazada. Si necesitás más ayuda, creá un nuevo ticket.' : 'Este ticket está cerrado. Si necesitás más ayuda, creá un nuevo ticket.'}
        onLiveStatus={s => setStatus(s.status)}
      />
    </div>
  )
}

export default function SoportePage() {
  const { data, mutate, isLoading } = useSWR('/api/cuenta/tickets', fetcher, { refreshInterval: 20000 })
  const tickets: TicketRow[] = data?.tickets ?? []
  const [selected, setSelected] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const prevUnread = useRef<Record<number, number> | null>(null)
  const markRead = useCallback(() => { void mutate() }, [mutate])

  // Notify about new GM replies on tickets that are not open on screen
  useEffect(() => {
    if (!data) return
    const list: TicketRow[] = data.tickets ?? []
    const now = Object.fromEntries(list.map(t => [t.id, t.unread]))
    if (prevUnread.current) {
      for (const t of list) {
        if (t.id !== selected && t.unread > (prevUnread.current[t.id] ?? 0)) {
          notify.info('Nueva respuesta del GM', `Tenés una respuesta nueva en el ticket #${t.id}: ${t.subject}`)
        }
      }
    }
    prevUnread.current = now
  }, [data, selected])

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Ayuda</span>
          <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white mt-1">Soporte</h1>
          <p className="text-sm text-slate-400">Hablá con el equipo de Game Masters. Las respuestas llegan en tiempo real.</p>
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setSelected(null) }} className="btn-gold w-full sm:w-auto"><Plus className="w-4 h-4" /> Nuevo ticket</button>
        )}
      </header>

      {creating && <NewTicketForm onCancel={() => setCreating(false)} onCreated={id => { setCreating(false); mutate(); setSelected(id) }} />}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className={`panel-card overflow-hidden ${selected ? 'hidden lg:block' : ''}`} aria-label="Mis tickets">
          {isLoading ? <Skeletons rows={3} /> : tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No tenés tickets" text="Si algo no funciona en el juego, creá un ticket y un GM te va a ayudar." />
          ) : (
            <ul className="divide-y divide-white/5 max-h-[70svh] overflow-y-auto">
              {tickets.map(t => (
                <li key={t.id}>
                  <button onClick={() => setSelected(t.id)} aria-current={selected === t.id}
                    className={`w-full text-left p-4 flex gap-3 hover:bg-white/[0.03] ${selected === t.id ? 'bg-[#74ACDF]/10 shadow-[inset_3px_0_0_#74ACDF]' : ''}`}>
                    <MessageSquare className="w-4 h-4 text-[#74ACDF] mt-1 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="font-mono text-[11px] text-slate-500">#{t.id}</span><TicketStatus status={t.status} /></span>
                      <span className="block text-sm text-white font-medium truncate mt-1">{t.subject}</span>
                      <span className="block text-xs text-slate-500">{fmtAgo(t.last_reply_at ?? t.created_at)}</span>
                    </span>
                    {t.unread > 0 && <span className="self-center min-w-6 h-6 px-1.5 rounded-full bg-[#F6B40E] text-[#1a1200] text-xs font-bold flex items-center justify-center" aria-label={`${t.unread} respuestas nuevas`}>{t.unread}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={selected ? '' : 'hidden lg:block'}>
          {selected ? (
            <TicketView key={selected} id={selected} onBack={() => setSelected(null)} onRead={markRead} />
          ) : (
            <div className="panel-card h-full min-h-[300px] flex items-center justify-center">
              <EmptyState icon={MessageSquare} title="Elegí un ticket" text="Seleccioná una solicitud para ver la conversación con el GM." />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
