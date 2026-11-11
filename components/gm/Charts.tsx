'use client'

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const axis = { stroke: '#5f7896', fontSize: 11, tickLine: false, axisLine: false } as const
const tooltipStyle = {
  contentStyle: { background: '#0A1628', border: '1px solid rgba(116,172,223,0.3)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#cfe6f8' },
  itemStyle: { color: '#fff' },
}
const dayLabel = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }

function Frame({ title, hint, children, empty }: { title: string; hint?: string; children: React.ReactNode; empty?: string | null }) {
  return (
    <div className="panel-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      {empty ? <div className="h-44 flex items-center justify-center text-center text-xs text-slate-500 px-4">{empty}</div> : <div className="h-44">{children}</div>}
    </div>
  )
}

export function DailyBars({ title, data, color = '#74ACDF', hint }: { title: string; data: Array<{ day: string; value: number }> | null; color?: string; hint?: string }) {
  return (
    <Frame title={title} hint={hint} empty={data === null ? 'Métrica no disponible (la tabla no existe o falta la migración).' : null}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data ?? []} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={dayLabel} {...axis} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...tooltipStyle} labelFormatter={l => dayLabel(String(l))} formatter={v => [v, 'Total']} cursor={{ fill: 'rgba(116,172,223,0.08)' }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function OnlineArea({ data }: { data: Array<{ t: string; players: number }> | null }) {
  const rows = (data ?? []).map(r => ({ ...r, label: new Date(r.t).toLocaleString('es-AR', { day: '2-digit', hour: '2-digit', minute: '2-digit' }) }))
  return (
    <Frame
      title="Jugadores online (48 h)"
      hint="muestreo cada 5 min"
      empty={data === null ? 'Métrica no disponible: ejecutá la migración del Panel GM.' : rows.length < 2 ? 'Todavía no hay suficiente historial: se registra desde la instalación del panel.' : null}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="onlineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#74ACDF" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#74ACDF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={40} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...tooltipStyle} formatter={v => [v, 'Jugadores']} />
          <Area type="monotone" dataKey="players" stroke="#74ACDF" strokeWidth={2} fill="url(#onlineFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </Frame>
  )
}
