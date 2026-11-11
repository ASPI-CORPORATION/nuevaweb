'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Wifi, WifiOff, RefreshCw, Sparkles, Shield, User, Info } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { useTicketStream, type ChatMessage, type TicketLiveStatus } from './useTicketStream'

interface QuickReply { id: number; label: string; filled: string }

interface Props {
  ticketId: number
  mode: 'gm' | 'player'
  initial: ChatMessage[]
  detailUrl: string
  sendUrl: string
  /** Builds the POST body for a message (GM: { action: 'reply', message }, player: { message }) */
  buildBody: (message: string) => Record<string, unknown>
  canWrite: boolean
  closedNotice?: string
  quickReplies?: QuickReply[]
  onLiveStatus?: (s: TicketLiveStatus) => void
}

const time = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function TicketChat({ ticketId, mode, initial, detailUrl, sendUrl, buildBody, canWrite, closedNotice, quickReplies, onLiveStatus }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const atBottom = useRef(true)

  const { messages, live, conn, refresh } = useTicketStream({
    ticketId, initial, detailUrl,
    onIncoming: m => {
      const fromOtherSide = mode === 'player' ? m.kind === 'gm' : m.kind === 'player'
      if (fromOtherSide) {
        notify.info(mode === 'player' ? 'Nueva respuesta del GM' : 'Nuevo mensaje del jugador', `${m.author}: ${m.body.slice(0, 90)}${m.body.length > 90 ? '…' : ''}`)
      }
    },
  })

  useEffect(() => { if (live) onLiveStatus?.(live) }, [live, onLiveStatus])

  useEffect(() => {
    const el = listRef.current
    if (el && atBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    const message = text.trim()
    if (message.length < 2 || sending) return
    setSending(true)
    try {
      const res = await fetch(sendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildBody(message)) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { notify.error('No se pudo enviar el mensaje', d.error); return }
      setText('')
      atBottom.current = true
      await refresh()
    } catch {
      notify.error('Error de conexión', 'El mensaje no se envió. Intentá nuevamente.')
    } finally {
      setSending(false)
    }
  }

  const insertTemplate = (q: QuickReply) => {
    setText(prev => (prev.trim() ? `${prev.trim()}\n\n${q.filled}` : q.filled))
    requestAnimationFrame(() => {
      const el = textRef.current
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
    })
  }

  const ConnIcon = conn === 'live' ? Wifi : conn === 'polling' ? RefreshCw : WifiOff
  const connLabel = { connecting: 'Conectando…', live: 'En vivo', reconnecting: 'Reconectando…', polling: 'Actualización periódica' }[conn]

  return (
    <div className="panel-card flex flex-col overflow-hidden h-[70svh] min-h-[420px] lg:h-[640px]">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 text-xs">
        <span className="font-semibold text-slate-300">Conversación</span>
        <span className={`inline-flex items-center gap-1.5 ${conn === 'live' ? 'text-green-400' : 'text-[#F6B40E]'}`} aria-live="polite">
          <ConnIcon className={`w-3.5 h-3.5 ${conn === 'reconnecting' || conn === 'connecting' ? 'animate-pulse' : ''}`} /> {connLabel}
        </span>
      </div>

      <div
        ref={listRef}
        onScroll={e => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
        className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-3"
        role="log"
        aria-label="Mensajes del ticket"
      >
        {messages.map(m => {
          if (m.kind === 'system') {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1 max-w-[90%] text-center">
                  <Info className="w-3 h-3 shrink-0" /> {m.body} · {time(m.createdAt)}
                </span>
              </div>
            )
          }
          const mine = (mode === 'player' && m.kind === 'player') || (mode === 'gm' && m.kind === 'gm')
          const gm = m.kind === 'gm'
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 border ${
                gm ? 'bg-[#74ACDF]/12 border-[#74ACDF]/30' : 'bg-white/[0.05] border-white/10'
              } ${mine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                <div className="flex items-center gap-1.5 text-[11px] mb-1">
                  {gm ? <Shield className="w-3 h-3 text-[#74ACDF]" /> : <User className="w-3 h-3 text-slate-400" />}
                  <span className={gm ? 'font-semibold text-[#cfe6f8]' : 'font-semibold text-slate-200'}>{gm ? `GM ${m.author}` : m.author}</span>
                  <span className="text-slate-500">· {time(m.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          )
        })}
      </div>

      {canWrite ? (
        <div className="border-t border-white/10 p-3 space-y-2 bg-[#0A1628]">
          {quickReplies && quickReplies.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="toolbar" aria-label="Respuestas rápidas">
              <Sparkles className="w-4 h-4 text-[#F6B40E] shrink-0 self-center" aria-hidden="true" />
              {quickReplies.map(q => (
                <button key={q.id} type="button" onClick={() => insertTemplate(q)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border border-[#F6B40E]/30 text-[#ffe08a] bg-[#F6B40E]/10 hover:bg-[#F6B40E]/20">
                  {q.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send() } }}
              rows={3}
              maxLength={4000}
              placeholder={mode === 'gm' ? 'Escribí la respuesta… (Ctrl+Enter para enviar)' : 'Escribí tu mensaje…'}
              aria-label="Mensaje"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border text-sm outline-none resize-none"
            />
            <button onClick={send} disabled={sending || text.trim().length < 2} className="btn-primary px-4 py-3 shrink-0" aria-label="Enviar mensaje">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-400 text-center">{closedNotice ?? 'No se pueden enviar mensajes en este ticket.'}</div>
      )}
    </div>
  )
}
