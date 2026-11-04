import { getSession } from '@/lib/auth'
import { queryCms, queryCmsFirst } from '@/lib/db'
import { ShopClient } from '@/components/shop/ShopClient'
import { ShoppingBag } from 'lucide-react'

interface ShopItem {
  id: number
  item_entry: number
  name: string
  description: string
  price_coins: number
  category: string
  image: string
  stock: number
}

async function getShopItems(): Promise<ShopItem[]> {
  try {
    return await queryCms<ShopItem>(
      'SELECT id, item_entry, name, description, price_coins, category, image, stock FROM cms_shop_items WHERE active = 1 ORDER BY category, price_coins'
    )
  } catch {
    return []
  }
}

async function getUserCoins(accountId: number): Promise<number> {
  try {
    const row = await queryCmsFirst<{ coins: number }>(
      'SELECT coins FROM cms_user_coins WHERE account_id = ?',
      [accountId]
    )
    return row?.coins ?? 0
  } catch {
    return 0
  }
}

export default async function ShopPage() {
  const session = await getSession()
  const items = await getShopItems()
  const coins = session ? await getUserCoins(session.id) : 0

  const categories = [...new Set(items.map(i => i.category))]

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-yellow-400" />
              </div>
              <h1 className="font-['Cinzel'] font-black text-4xl text-white">Tienda</h1>
            </div>
            <p className="text-slate-400">Sets Custom, Monturas, Mascotas y más con Moneda Argentina</p>
          </div>
          {session && (
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Tu saldo</div>
              <div className="font-['Cinzel'] font-bold text-2xl text-yellow-400">
                {coins.toLocaleString('es-AR')} <span className="text-sm text-yellow-500">MA</span>
              </div>
            </div>
          )}
        </div>

        <ShopClient
          items={items}
          categories={categories}
          session={session ? { id: session.id, username: session.username } : null}
          initialCoins={coins}
        />
      </div>
    </div>
  )
}
