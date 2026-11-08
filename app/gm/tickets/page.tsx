'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, ChevronDown, Send } from 'lucide-react'
import { notify } from '@/components/ui/toaster'

interface GmTicket { id: number; subject: string; message: string; category: string; status: string; priority: string; created_at: string; username?: string; character_name?: string | null }

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_COLORS: Record<string, string> = {
  'Abierto': 'text-green-400 bg-green-500/10 border-green-500/20',
  'En Revisión': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Cerrado': 'text-slate-400 bg-slate-700/40 border-slate-600/40',
}
const PRIORITY_COLORS: Record<string, string> = {
  'Baja': 'text-slate-400',
  'Media': 'text-blue-400',
  'Alta': 'text-orange-400',
  'Urgente': 'text-red-400',
}

export default function GmTicketsPage() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState('')
  const { data, mutate } = useSWR('/api/gm/tickets', fetcher)
  const tickets = data?.tickets ?? []

  const updateTicket = async (ticketId: number, action: string, payload: Record<string, unknown> = {}) => {
    setLoading(`${ticketId}-${action}`)
    try {
      const res = await fetch('/api/gm/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, action, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error('No se pudo actualizar el ticket', data.error || 'Ocurrió un problema. Intentá nuevamente.')
        return
      }
      notify.success('Ticket actualizado', `El ticket #${ticketId} se actualizó correctamente.`)
      mutate()
      setReply('')
    } catch {
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Tickets</h1>

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No hay tickets abiertos</p>
        </div>
      ) : tickets.map((t: GmTicket) => (
        <div key={t.id} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
          >
            <div className="flex items-start gap-4 text-left flex-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{t.subject}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[t.priority]} bg-current/5`}>
                    {t.priority}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {t.category} · #{t.id} · {format(new Date(t.created_at), 'd MMM', { locale: es })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[t.status]}`}>
                {t.status}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {expanded === t.id && (
            <div className="px-5 pb-5 border-t border-slate-700/40">
              <div className="py-4 text-slate-300 text-sm leading-relaxed border-b border-slate-700/30 mb-4">
                {t.message}
              </div>

              {/* Reply */}
              <div className="space-y-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Escribí tu respuesta..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 outline-none focus:border-green-500 resize-none text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateTicket(t.id, 'reply', { message: reply })}
                    disabled={!reply.trim() || !!loading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Responder
                  </button>
                  {t.status !== 'En Revisión' && (
                    <button
                      onClick={() => updateTicket(t.id, 'status', { status: 'En Revisión' })}
                      className="px-4 py-2 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 rounded-xl text-sm font-medium transition-colors"
                    >
                      En Revisión
                    </button>
                  )}
                  {t.status !== 'Cerrado' && (
                    <button
                      onClick={() => updateTicket(t.id, 'status', { status: 'Cerrado' })}
                      className="px-4 py-2 bg-slate-700/40 border border-slate-600/40 text-slate-400 hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
