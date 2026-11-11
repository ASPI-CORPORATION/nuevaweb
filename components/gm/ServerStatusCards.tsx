'use client'

import { KeyRound, Globe2 } from 'lucide-react'

export interface ServerStatusData {
  authserver: { online: boolean; latencyMs: number | null; endpoint: string }
  worldserver: { online: boolean; soap: boolean; portOpen: boolean | null; connectedPlayers: number | null; uptime: string | null; revision: string | null }
  checkedAt: string
}

function Card({ icon: Icon, name, online, lines }: { icon: typeof Globe2; name: string; online: boolean; lines: Array<string | null> }) {
  const color = online ? '#4ade80' : '#f87171'
  return (
    <div className="panel-card p-4 relative overflow-hidden" style={{ borderColor: `${color}40` }}>
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="w-4 h-4 text-[#74ACDF]" /> {name}</div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color }}>
          <span className={`w-2.5 h-2.5 rounded-full ${online ? 'animate-pulse' : ''}`} style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
        {lines.filter(Boolean).map((l, i) => <li key={i} className="break-words">{l}</li>)}
      </ul>
    </div>
  )
}

export function ServerStatusCards({ status }: { status: ServerStatusData }) {
  const a = status.authserver, w = status.worldserver
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card icon={KeyRound} name="Authserver" online={a.online} lines={[
        `Puerto ${a.endpoint} ${a.online ? `responde (${a.latencyMs} ms)` : 'no responde'}`,
        'Verificado con conexión TCP real',
      ]} />
      <Card icon={Globe2} name="Worldserver" online={w.online} lines={[
        w.soap ? 'Responde a .server info por SOAP' : 'Sin respuesta SOAP (no se usa MySQL como prueba)',
        w.connectedPlayers != null ? `Jugadores conectados: ${w.connectedPlayers}` : null,
        w.uptime ? `Uptime: ${w.uptime}` : null,
        w.portOpen != null ? `Puerto de juego ${w.portOpen ? 'abierto' : 'cerrado'}` : null,
        w.revision,
      ]} />
    </div>
  )
}
