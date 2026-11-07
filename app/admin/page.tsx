import { requirePageRole } from '@/lib/page-guard'
import { queryAuth, queryCharacters, queryCms } from '@/lib/db'
import AdminStatsCharts from '@/components/admin/AdminStatsCharts'
import { Users, Newspaper, ShoppingCart, TrendingUp } from 'lucide-react'

async function getStats() {
  const [
    totalAccounts,
    todayAccounts,
    weekAccounts,
    onlineCount,
    openTickets,
    totalOrders,
    monthRevenue,
    todayVotes,
    newsCount,
  ] = await Promise.all([
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account WHERE DATE(joindate) = CURDATE()').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account WHERE joindate >= DATE_SUB(NOW(), INTERVAL 7 DAY)').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryAuth<{ c: number }>('SELECT COUNT(*) as c FROM account WHERE online = 1').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>("SELECT COUNT(*) as c FROM cms_tickets WHERE status != 'Cerrado'").then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_orders').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COALESCE(SUM(price),0) as c FROM cms_orders WHERE MONTH(created_at) = MONTH(NOW()) AND status = "completado"').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_votes WHERE DATE(created_at) = CURDATE()').then(r => r[0]?.c ?? 0).catch(() => 0),
    queryCms<{ c: number }>('SELECT COUNT(*) as c FROM cms_news WHERE published = 1').then(r => r[0]?.c ?? 0).catch(() => 0),
  ])

  const weeklySignups = await queryAuth<{ day: string; count: number }>(
    `SELECT DATE_FORMAT(joindate, '%Y-%m-%d') as day, COUNT(*) as count
     FROM account WHERE joindate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DATE(joindate) ORDER BY day ASC`
  ).catch(() => [])

  return { totalAccounts, todayAccounts, weekAccounts, onlineCount, openTickets, totalOrders, monthRevenue, todayVotes, newsCount, weeklySignups }
}

export default async function AdminPage() {
  await requirePageRole('admin', '/admin')
  const stats = await getStats()

  const statCards = [
    { label: 'Cuentas Totales', value: stats.totalAccounts, sub: `+${stats.todayAccounts} hoy`, icon: Users, color: 'purple' },
    { label: 'Online Ahora', value: stats.onlineCount, sub: `${stats.weekAccounts} esta semana`, icon: TrendingUp, color: 'green' },
    { label: 'Noticias', value: stats.newsCount, sub: 'publicadas', icon: Newspaper, color: 'blue' },
    { label: 'Órdenes Mes', value: stats.totalOrders, sub: `${stats.monthRevenue} Monedas`, icon: ShoppingCart, color: 'gold' },
  ]

  const colorMap: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/25 text-purple-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/25 text-green-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/25 text-blue-400',
    gold: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/25 text-yellow-400',
  }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Panel Admin</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5`}>
            <div className="flex items-start justify-between mb-3">
              <Icon className="w-5 h-5 opacity-80" />
              <span className="text-xs text-slate-500">{sub}</span>
            </div>
            <div className="text-3xl font-black text-white mb-0.5">{Number(value).toLocaleString()}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Registros últimos 7 días</h2>
          <AdminStatsCharts weeklySignups={stats.weeklySignups as { day: string; count: number }[]} />
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Estado del servidor</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-700/40">
              <span className="text-slate-400">Jugadores online</span>
              <span className="text-green-400 font-medium">{stats.onlineCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700/40">
              <span className="text-slate-400">Tickets abiertos</span>
              <span className={stats.openTickets > 5 ? 'text-red-400 font-medium' : 'text-white'}>{stats.openTickets}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700/40">
              <span className="text-slate-400">Votos hoy</span>
              <span className="text-blue-400 font-medium">{stats.todayVotes}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Órdenes totales</span>
              <span className="text-white">{stats.totalOrders}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
