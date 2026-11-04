'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminStatsCharts({ weeklySignups }: { weeklySignups: { day: string | Date; count: number }[] }) {
  const data = weeklySignups.map(r => ({
    day: format(r.day instanceof Date ? r.day : parseISO(String(r.day)), 'EEE d', { locale: es }),
    registros: Number(r.count),
  }))

  if (data.length === 0) {
    return <div className="text-center py-8 text-slate-500 text-sm">Sin datos esta semana</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#e2e8f0' }}
          itemStyle={{ color: '#a855f7' }}
        />
        <Bar dataKey="registros" fill="#a855f7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
