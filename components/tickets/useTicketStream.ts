'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ChatMessage { id: number; kind: 'player' | 'gm' | 'system'; author: string; body: string; createdAt: string }
export interface TicketLiveStatus { status: string; assignedTo: string | null; priority: string; rejectedReason: string | null }
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'polling'

/**
 * Live ticket conversation: Server-Sent Events first (EventSource reconnects by itself and
 * resumes with Last-Event-ID), periodic polling as fallback if the stream keeps failing
 * (e.g. a proxy that buffers responses). Messages are deduplicated by id.
 */
export function useTicketStream(opts: {
  ticketId: number
  initial: ChatMessage[]
  detailUrl: string
  onIncoming?: (m: ChatMessage) => void
}) {
  const { ticketId, initial, detailUrl } = opts
  const [messages, setMessages] = useState<ChatMessage[]>(initial)
  const [live, setLive] = useState<TicketLiveStatus | null>(null)
  const [conn, setConn] = useState<ConnectionState>('connecting')
  const seen = useRef(new Set(initial.map(m => m.id)))
  const onIncoming = useRef(opts.onIncoming)
  useEffect(() => { onIncoming.current = opts.onIncoming })

  const merge = useCallback((incoming: ChatMessage[], notify: boolean) => {
    const fresh = incoming.filter(m => !seen.current.has(m.id))
    if (!fresh.length) return
    for (const m of fresh) seen.current.add(m.id)
    setMessages(prev => [...prev, ...fresh].sort((a, b) => a.id - b.id))
    if (notify) for (const m of fresh) onIncoming.current?.(m)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(detailUrl, { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json()
      merge(d.messages ?? [], true)
      if (d.ticket) {
        setLive({ status: d.ticket.status, assignedTo: d.ticket.assigned_name ?? null, priority: d.ticket.priority, rejectedReason: d.ticket.rejected_reason ?? null })
      }
    } catch {}
  }, [detailUrl, merge])

  useEffect(() => {
    let es: EventSource | null = null
    let poll: ReturnType<typeof setInterval> | null = null
    let failures = 0
    let stopped = false
    const lastId = () => Math.max(0, ...Array.from(seen.current))

    const startPolling = () => {
      if (poll || stopped) return
      setConn('polling')
      poll = setInterval(refresh, 5000)
    }

    if (typeof EventSource === 'undefined') {
      startPolling()
    } else {
      es = new EventSource(`/api/tickets/${ticketId}/stream?after=${lastId()}`)
      es.addEventListener('open', () => { failures = 0; setConn('live') })
      es.addEventListener('message', e => {
        try { merge([JSON.parse((e as MessageEvent).data)], true) } catch {}
      })
      es.addEventListener('status', e => {
        try { setLive(JSON.parse((e as MessageEvent).data)) } catch {}
      })
      es.addEventListener('error', () => {
        failures++
        if (es?.readyState === EventSource.CLOSED || failures >= 4) {
          es?.close()
          startPolling()
        } else {
          setConn('reconnecting')
        }
      })
    }

    return () => {
      stopped = true
      es?.close()
      if (poll) clearInterval(poll)
    }
  }, [ticketId, merge, refresh])

  return { messages, live, conn, refresh }
}
