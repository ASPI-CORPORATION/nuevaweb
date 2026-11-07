'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Coins, AlertCircle, Check } from 'lucide-react'
import Link from 'next/link'

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

interface ShopClientProps {
  items: ShopItem[]
  categories: string[]
  session: { id: number; username: string } | null
  initialCoins: number
}

function ShopItemCard({ item, onBuy, coins, buying }: {
  item: ShopItem
  onBuy: (id: number) => void
  coins: number
  buying: number | null
}) {
  const canAfford = coins >= item.price_coins
  const outOfStock = item.stock === 0
  const isBuying = buying === item.id

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-slate-900/60 border rounded-2xl overflow-hidden transition-all duration-300 ${
        canAfford && !outOfStock
          ? 'border-slate-700/50 hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(246, 180, 14,0.1)]'
          : 'border-slate-700/30 opacity-70'
      }`}
    >
      {/* Image */}
      <div className="relative h-40 bg-slate-800 overflow-hidden">
        {item.image ? (
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl opacity-20">⚔️</div>
          </div>
        )}
        {/* Stock badge */}
        {item.stock > 0 && item.stock < 10 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-orange-500/80 text-white text-xs font-bold">
            Quedan {item.stock}
          </div>
        )}
        {item.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-semibold">Sin stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1 text-sm line-clamp-1">{item.name}</h3>
        {item.description && (
          <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className={`font-['Cinzel'] font-bold ${canAfford ? 'text-yellow-400' : 'text-slate-500'}`}>
              {item.price_coins}
            </span>
          </div>

          <button
            onClick={() => onBuy(item.id)}
            disabled={!canAfford || outOfStock || isBuying}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              canAfford && !outOfStock
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300'
                : 'bg-slate-700/40 text-slate-500 cursor-not-allowed border border-transparent'
            }`}
          >
            {isBuying ? (
              <>Comprando...</>
            ) : !canAfford && !outOfStock ? (
              <>Sin monedas</>
            ) : outOfStock ? (
              <>Sin stock</>
            ) : (
              <><ShoppingCart className="w-3.5 h-3.5" /> Comprar</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function ShopClient({ items, categories, session, initialCoins }: ShopClientProps) {
  const [activeCategory, setActiveCategory] = useState('')
  const [coins, setCoins] = useState(initialCoins)
  const [buying, setBuying] = useState<number | null>(null)
  const [modal, setModal] = useState<{ item: ShopItem; characterName: string } | null>(null)
  const [charInput, setCharInput] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = activeCategory ? items.filter(i => i.category === activeCategory) : items

  const handleBuyClick = (id: number) => {
    if (!session) return
    const item = items.find(i => i.id === id)
    if (!item) return
    setModal({ item, characterName: '' })
    setCharInput('')
  }

  const confirmBuy = async () => {
    if (!modal || !session) return
    setBuying(modal.item.id)
    setMessage(null)

    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: modal.item.id, characterName: charInput }),
      })

      const data = await res.json()
      if (res.ok) {
        setCoins(c => c - modal.item.price_coins)
        setMessage({ type: 'success', text: `¡Comprado! Revisá tu correo en el juego con ${charInput}.` })
        setModal(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al comprar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setBuying(null)
    }
  }

  if (!session) {
    return (
      <div>
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 text-sm text-blue-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            <Link href="/login" className="font-semibold underline">Iniciá sesión</Link>{' '}
            para comprar items con tu Moneda Argentina.
          </span>
        </div>
        <ShopGrid items={filtered} categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} onBuy={() => {}} coins={0} buying={null} />
      </div>
    )
  }

  return (
    <div>
      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-4 rounded-xl flex items-center gap-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <ShopGrid items={filtered} categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} onBuy={handleBuyClick} coins={coins} buying={buying} />

      {/* Buy Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[90svh] overflow-y-auto overscroll-contain"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-4">Confirmar Compra</h3>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                <div className="font-semibold text-white">{modal.item.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">{modal.item.price_coins}</span>
                  <span className="text-slate-400 text-sm">Moneda Argentina</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nombre del personaje
                </label>
                <input
                  type="text"
                  value={charInput}
                  onChange={e => setCharInput(e.target.value)}
                  placeholder="NombreDelPersonaje"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-500">El item se enviará por correo a este personaje.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBuy}
                  disabled={!charInput.trim() || !!buying}
                  className="flex-1 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {buying ? 'Comprando...' : 'Confirmar Compra'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ShopGrid({ items, categories, activeCategory, setActiveCategory, onBuy, coins, buying }: {
  items: ShopItem[]
  categories: string[]
  activeCategory: string
  setActiveCategory: (c: string) => void
  onBuy: (id: number) => void
  coins: number
  buying: number | null
}) {
  return (
    <div>
      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            !activeCategory
              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
              : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white'
          }`}
        >
          Todo
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeCategory === cat
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <p className="text-xl mb-2">No hay items en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map(item => (
            <ShopItemCard key={item.id} item={item} onBuy={onBuy} coins={coins} buying={buying} />
          ))}
        </div>
      )}
    </div>
  )
}
