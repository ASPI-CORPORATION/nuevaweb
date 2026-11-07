import { requirePageRole } from '@/lib/page-guard'
import { queryAuth, queryCms, queryCharacters } from '@/lib/db'
import { getServerStatus } from '@/lib/soap'
import { Users, Shield, Ban, TrendingUp, Server, AlertTriangle } from 'lucide-react'

async function getDirectivoStats() {
  const [
    totalAccounts,
    onlineCount,
    activeBans,
    totalGmLogs,
    openTickets,
    monthOrders,
    totalCoins,
    directivosLogs,
  ] = await Promise.all([
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account WHERE online = 1').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account_banned WHERE active = 1').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_gm_logs').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>("SELECT COUNT(*) as c FROM cms_tickets WHERE status != 'Cerrado'").then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_orders WHERE MONTH(created_at) = MONTH(NOW())').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COALESCE(SUM(coins), 0) as c FROM cms_user_coins').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_directivos_logs').then(r => r[0]?.c ?? 0).catch(() => 0),
  ])

  return { totalAccounts, onlineCount, activeBans, totalGmLogs, openTickets, monthOrders, totalCoins, directivosLogs }
}

export default async function DirectivosPage() {
  await requirePageRole('directivo', '/directivos')
  const stats = await getDirectivoStats()

  const statCards = [
    { label: 'Cuentas Totales', value: stats.totalAccounts, icon: Users, color: '#3b82f6' },
    { label: 'Online Ahora', value: stats.onlineCount, icon: TrendingUp, color: '#22c55e' },
    { label: 'Baneos Activos', value: stats.activeBans, icon: Ban, color: '#ef4444' },
    { label: 'Monedas en circulación', value: stats.totalCoins, icon: TrendingUp, color: '#FFD700' },
    { label: 'Logs de Directivos', value: stats.directivosLogs, icon: Shield, color: '#a855f7' },
    { label: 'Tickets Abiertos', value: stats.openTickets, icon: AlertTriangle, color: '#f97316' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-['Cinzel'] font-black text-4xl mb-2" style={{ color: '#FFD700' }}>
          Panel de Directivos
        </h1>
        <p className="text-sm" style={{ color: '#a89060' }}>Acceso total al servidor — Todas las acciones quedan registradas permanentemente</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255, 215, 0, 0.03)', border: '1px solid rgba(255, 215, 0, 0.1)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="text-3xl font-black text-white mb-0.5">{Number(value).toLocaleString()}</div>
            <div className="text-xs" style={{ color: '#a89060' }}>{label}</div>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255, 165, 0, 0.05)', border: '1px solid rgba(255, 165, 0, 0.2)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-orange-400 text-sm">Recordatorio</span>
        </div>
        <p className="text-xs" style={{ color: '#a89060' }}>
          Cada acción realizada en este panel queda registrada permanentemente en <code className="text-orange-400">cms_directivos_logs</code> y nunca puede ser eliminada.
          Usá este poder con responsabilidad.
        </p>
      </div>
    </div>
  )
}
