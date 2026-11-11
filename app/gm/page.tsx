'use client'

import Link from 'next/link'
import useSWR from 'swr'
import {
  Users, Swords, LifeBuoy, Eye, Gavel, UserPlus, Radio, ArrowRight,
} from 'lucide-react'
import { fetcher, PageHeader, StatCard, ErrorBox, Skeletons, OnlineDot } from '@/components/gm/ui'
import { ServerStatusCards } from '@/components/gm/ServerStatusCards'
import { DailyBars, OnlineArea } from '@/components/gm/Charts'
import { CLASS_COLORS } from '@/lib/gm/wow-data'
import { GM_TIER_LABEL, type GmTier } from '@/lib/gm/permissions'

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('es-AR'))

export default function GmDashboard() {
  const { data, error, isLoading } = useSWR('/api/gm/overview', fetcher, { refreshInterval: 30000 })
  const { data: online } = useSWR('/api/gm/characters?online=1', fetcher, { refreshInterval: 30000 })

  if (error) return <ErrorBox error={error} />
  if (isLoading || !data) return <Skeletons rows={6} h="h-24" />
  const c = data.cards

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Panel Game Master" title={`Hola, ${data.viewer.username}`}
        description={`${GM_TIER_LABEL[data.viewer.tier as GmTier]} · Datos en vivo de AzerothCore y del CMS.`} />

      <ServerStatusCards status={data.status} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Radio} label="Jugadores conectados" value={n(c.onlinePlayers)} hint={c.onlinePlayersSource ? `según ${c.onlinePlayersSource}` : 'no disponible'} color="#4ade80" />
        <StatCard icon={Users} label="Cuentas registradas" value={n(c.accounts)} hint="acore_auth.account" />
        <StatCard icon={Swords} label="Personajes creados" value={n(c.characters)} color="#a78bfa" />
        <StatCard icon={UserPlus} label="Registros de hoy" value={n(c.newToday)} color="#75C7FF" />
        <StatCard icon={LifeBuoy} label="Tickets abiertos" value={n(c.ticketsOpen)} hint="abiertos + aceptados" color="#F6B40E" />
        <StatCard icon={Eye} label="En revisión" value={n(c.ticketsReview)} color="#fb923c" />
        <StatCard icon={Gavel} label="Sanciones activas" value={n(c.sanctionsActive)} hint="cuentas + personajes" color="#f87171" />
        <Link href="/gm/soporte" className="panel-card p-4 flex flex-col justify-between hover:border-[#74ACDF]/50 transition-colors">
          <span className="text-xs uppercase tracking-wider text-slate-400">Atajo</span>
          <span className="text-white font-semibold flex items-center gap-2 mt-2">Ir al centro de soporte <ArrowRight className="w-4 h-4" /></span>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <OnlineArea data={data.charts.online} />
        <DailyBars title="Cuentas registradas por día" hint="14 días" data={data.charts.registrations} />
        <DailyBars title="Tickets recibidos" hint="14 días" data={data.charts.ticketsIn} color="#F6B40E" />
        <DailyBars title="Tickets resueltos" hint="cerrados, 14 días" data={data.charts.ticketsSolved} color="#4ade80" />
        <DailyBars title="Sanciones aplicadas" hint="baneos de cuenta y personaje" data={data.charts.sanctions} color="#f87171" />
      </div>

      <section className="panel-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2"><Radio className="w-4 h-4 text-green-400" /> Jugadores online</h2>
          <Link href="/gm/online" className="text-xs text-[#74ACDF] hover:underline">Ver todos</Link>
        </div>
        {!online ? <Skeletons rows={3} h="h-10" /> : online.characters.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No hay jugadores conectados en este momento.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {online.characters.slice(0, 8).map((ch: { guid: number; name: string; level: number; classId: number; className: string; zone: string; faction: string | null }) => (
              <li key={ch.guid} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="font-semibold min-w-0 truncate" style={{ color: CLASS_COLORS[ch.classId] }}>{ch.name}</span>
                <span className="text-slate-500 text-xs">Nv {ch.level} · {ch.className}</span>
                <span className="ml-auto text-xs text-slate-400 truncate">{ch.zone}</span>
                <OnlineDot online />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
