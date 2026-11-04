import { getSession } from '@/lib/auth'
import { queryCms } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ShoppingBag, ThumbsUp } from 'lucide-react'

export default async function HistorialPage() {
  const session = await getSession()
  if (!session) return null

  let orders: Array<{ id: number; item_name: string; price: number; status: string; created_at: Date }> = []
  let votes: Array<{ site: string; created_at: Date; rewarded: number }> = []

  try {
    orders = await queryCms(
      'SELECT id, item_name, price, status, created_at FROM cms_orders WHERE account_id = ? ORDER BY created_at DESC LIMIT 20',
      [session.id]
    )
    votes = await queryCms(
      'SELECT site, created_at, rewarded FROM cms_votes WHERE account_id = ? ORDER BY created_at DESC LIMIT 20',
      [session.id]
    )
  } catch {}

  const statusColor: Record<string, string> = {
    Pendiente: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    Entregado: 'text-green-400 bg-green-500/10 border-green-500/20',
    Reembolsado: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Fallido: 'text-red-400 bg-red-500/10 border-red-500/20',
  }

  return (
    <div className="space-y-6">
      <h1 className="font-['Cinzel'] font-black text-3xl text-white">Historial</h1>

      {/* Compras */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-yellow-400" />
          <h2 className="font-semibold text-white">Compras</h2>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No tenés compras todavía</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-white">{order.item_name}</div>
                  <div className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-yellow-400">{order.price} MA</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[order.status] || statusColor.Pendiente}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Votos */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2">
          <ThumbsUp className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-white">Votos</h2>
        </div>
        {votes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No tenés votos registrados</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {votes.map((v, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-white">{v.site}</div>
                  <div className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: es })}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${v.rewarded ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-slate-400 bg-slate-700/40 border-slate-600/40'}`}>
                  {v.rewarded ? 'Recompensado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
