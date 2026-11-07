import { requirePageRole } from '@/lib/page-guard'
import { queryAuth, queryCms } from '@/lib/db'
import { Users, MessageSquare, Shield, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function GmDashboard() {
  await requirePageRole('gm', '/gm')

  let onlinePlayers = 0
  let openTickets = 0
  let recentBans: Array<{ bandate: Date; bannedby: string; banreason: string; account: string }> = []
  let recentLogs: Array<{ gm_account_id: number; action: string; details: string; created_at: Date }> = []

  try {
    const [onlineRow] = await queryAuth<{ count: number }>(
      'SELECT COUNT(*) as count FROM account WHERE online = 1'
    )
    onlinePlayers = onlineRow?.count ?? 0

    const [ticketsRow] = await queryCms<{ count: number }>(
      "SELECT COUNT(*) as count FROM cms_tickets WHERE status IN ('Abierto','En Revisión')"
    )
    openTickets = ticketsRow?.count ?? 0

    recentBans = await queryAuth<{ bandate: Date; bannedby: string; banreason: string; account: string }>(
      `SELECT b.bandate, b.bannedby, b.banreason, a.username as account
       FROM account_banned b JOIN account a ON b.id = a.id
       WHERE b.active = 1 ORDER BY b.bandate DESC LIMIT 5`
    )

    recentLogs = await queryCms<{ gm_account_id: number; action: string; details: string; created_at: Date }>(
      'SELECT gm_account_id, action, details, created_at FROM cms_gm_logs ORDER BY created_at DESC LIMIT 10'
    )
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-1">Dashboard GM</h1>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <Shield className="w-4 h-4" /> Panel de Game Master
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Online Ahora', value: onlinePlayers, icon: Activity, color: '#90EE90' },
          { label: 'Tickets Abiertos', value: openTickets, icon: MessageSquare, color: '#75C7FF' },
          { label: 'Baneos Activos', value: recentBans.length, icon: Shield, color: '#FF6B6B' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <div className="font-['Cinzel'] font-bold text-2xl" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Baneos recientes */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/40">
          <h2 className="font-semibold text-white">Baneos Recientes</h2>
        </div>
        {recentBans.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">No hay baneos activos</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {recentBans.map((ban, i) => (
              <div key={i} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{ban.account}</span>
                  <span className="text-xs text-slate-500">
                    {format(new Date(ban.bandate), 'd MMM', { locale: es })}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Por <span className="text-slate-300">{ban.bannedby}</span>: {ban.banreason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/gm/buscar', label: '🔍 Buscar Jugador', desc: 'Buscar por cuenta o personaje' },
          { href: '/gm/tickets', label: '🎫 Ver Tickets', desc: `${openTickets} tickets abiertos` },
          { href: '/gm/logs', label: '📋 Ver Logs', desc: 'Historial de acciones GM' },
        ].map(a => (
          <a key={a.href} href={a.href} className="bg-slate-800/60 border border-slate-700/50 hover:border-green-500/30 rounded-xl p-4 transition-all">
            <div className="font-semibold text-white mb-1">{a.label}</div>
            <div className="text-xs text-slate-400">{a.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
