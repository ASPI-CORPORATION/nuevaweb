import { getSession } from '@/lib/auth'
import { queryCharacters, queryCms, queryCmsFirst } from '@/lib/db'
import Link from 'next/link'
import { Coins, Users, ThumbsUp, ShoppingBag } from 'lucide-react'

const CLASS_NAMES: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladín', 3: 'Cazador', 4: 'Pícaro',
  5: 'Sacerdote', 6: 'Caballero de la Muerte', 7: 'Chamán',
  8: 'Mago', 9: 'Brujo', 11: 'Druida',
}
const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569',
  5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0',
  9: '#9482C9', 11: '#FF7D0A',
}

export default async function CuentaDashboard() {
  const session = await getSession()
  if (!session) return null

  let characters: Array<{ guid: number; name: string; level: number; class: number; race: number; online: number }> = []
  let coins = 0
  let recentVotes: Array<{ site: string; created_at: Date }> = []
  let recentOrders: Array<{ item_name: string; price: number; status: string; created_at: Date }> = []

  try {
    characters = await queryCharacters(
      'SELECT guid, name, level, class, race, online FROM characters WHERE account = ? AND deleteinfos_account IS NULL LIMIT 10',
      [session.id]
    )
    const coinsRow = await queryCmsFirst<{ coins: number }>(
      'SELECT coins FROM cms_user_coins WHERE account_id = ?',
      [session.id]
    )
    coins = coinsRow?.coins ?? 0
    recentVotes = await queryCms(
      'SELECT site, created_at FROM cms_votes WHERE account_id = ? ORDER BY created_at DESC LIMIT 5',
      [session.id]
    )
    recentOrders = await queryCms(
      'SELECT item_name, price, status, created_at FROM cms_orders WHERE account_id = ? ORDER BY created_at DESC LIMIT 5',
      [session.id]
    )
  } catch {
    // DB no disponible
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-1">Mi Cuenta</h1>
        <p className="text-slate-400 text-sm">Bienvenido de vuelta, <span className="text-white">{session.username}</span></p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Moneda Argentina', value: coins.toLocaleString('es-AR'), icon: Coins, color: '#F6B40E' },
          { label: 'Personajes', value: characters.length, icon: Users, color: '#75C7FF' },
          { label: 'Votos Totales', value: recentVotes.length + '+', icon: ThumbsUp, color: '#90EE90' },
          { label: 'Compras', value: recentOrders.length + '+', icon: ShoppingBag, color: '#F58CBA' },
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

      {/* Personajes */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
          <h2 className="font-semibold text-white">Mis Personajes</h2>
          <Link href="/cuenta/personajes" className="text-xs text-blue-400 hover:text-blue-300">Ver todos →</Link>
        </div>
        {characters.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No tenés personajes todavía</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {characters.slice(0, 5).map(char => (
              <div key={char.guid} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link href={`/armory/${char.name}`} className="font-semibold hover:underline" style={{ color: CLASS_COLORS[char.class] || '#fff' }}>
                    {char.name}
                  </Link>
                  <div className="text-xs text-slate-500">{CLASS_NAMES[char.class] || '?'} - Nivel {char.level}</div>
                </div>
                <div className="flex items-center gap-2">
                  {char.online ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Offline</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: '/vote', label: '🗳️ Votar', desc: 'Ganá Moneda Argentina' },
          { href: '/shop', label: '🛒 Tienda', desc: 'Gastá tus monedas' },
          { href: '/cuenta/soporte', label: '🎫 Soporte', desc: 'Crear ticket' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/40 rounded-xl p-4 transition-all hover:bg-slate-800/80"
          >
            <div className="font-semibold text-white mb-1">{action.label}</div>
            <div className="text-xs text-slate-400">{action.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
