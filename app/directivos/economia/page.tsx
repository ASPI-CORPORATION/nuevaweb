'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Coins, Gift, Loader2 } from 'lucide-react'
import { notify } from '@/components/ui/toaster'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DirectivosEconomiaPage() {
  const { data, mutate } = useSWR('/api/directivos/economia', fetcher)
  const richest = data?.richest ?? []
  const promos = data?.promos ?? []
  const recentOrders = data?.recentOrders ?? []

  const [coinForm, setCoinForm] = useState({ action: 'give_coins' as 'give_coins' | 'take_coins' | 'mass_give', accountId: '', amount: '', reason: '' })
  const [promoForm, setPromoForm] = useState({ code: '', coins: '', max_uses: '1', expires_at: '', reason: '' })
  const [savingCoins, setSavingCoins] = useState(false)
  const [savingPromo, setSavingPromo] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCoins = async () => {
    setSavingCoins(true)
    const res = await fetch('/api/directivos/economia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...coinForm, accountId: coinForm.accountId ? parseInt(coinForm.accountId) : undefined, amount: parseInt(coinForm.amount) }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingCoins(false)
    if (!res.ok) { notify.error(data.error || 'No se pudo completar la operación'); return }
    notify.success('Operación exitosa')
    setMsg('Operación exitosa')
    setCoinForm(f => ({ ...f, accountId: '', amount: '', reason: '' }))
    mutate()
  }

  const handlePromo = async () => {
    setSavingPromo(true)
    const res = await fetch('/api/directivos/economia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_promo', ...promoForm, coins: parseInt(promoForm.coins), max_uses: parseInt(promoForm.max_uses) }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingPromo(false)
    if (!res.ok) { notify.error(data.error || 'No se pudo crear el código'); return }
    notify.success('Código promo creado')
    setMsg('Código promo creado')
    setPromoForm({ code: '', coins: '', max_uses: '1', expires_at: '', reason: '' })
    mutate()
  }

  const goldStyle = { borderColor: 'rgba(246, 180, 14,0.2)' }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-6" style={{ color: '#F6B40E' }}>Economía</h1>

      {msg && <div className="mb-4 px-4 py-2 bg-green-500/15 border border-green-500/30 text-green-400 rounded-xl text-sm">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Coins */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4" style={{ color: '#F6B40E' }} />
            <h2 className="font-semibold text-white">Dar / Quitar monedas</h2>
          </div>
          <div className="space-y-3">
            <select value={coinForm.action} onChange={e => setCoinForm(f => ({ ...f, action: e.target.value as 'give_coins' | 'take_coins' }))}
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle}>
              <option value="give_coins">Dar monedas</option>
              <option value="take_coins">Quitar monedas</option>
              <option value="mass_give">Dar a TODOS los jugadores</option>
            </select>
            {coinForm.action !== 'mass_give' && (
              <input value={coinForm.accountId} onChange={e => setCoinForm(f => ({ ...f, accountId: e.target.value }))}
                placeholder="ID de la cuenta" className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
            )}
            <input value={coinForm.amount} onChange={e => setCoinForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="Cantidad de monedas" type="number"
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
            <input value={coinForm.reason} onChange={e => setCoinForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Motivo *" className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
            <button onClick={handleCoins} disabled={savingCoins}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F6B40E, #B8860B)' }}>
              {savingCoins && <Loader2 className="w-4 h-4 animate-spin" />} Ejecutar
            </button>
          </div>
        </div>

        {/* Promo codes */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4" style={{ color: '#F6B40E' }} />
            <h2 className="font-semibold text-white">Crear código promo</h2>
          </div>
          <div className="space-y-3">
            <input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Código (ej: ARGENTINA2025)" className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none font-mono uppercase" style={goldStyle} />
            <div className="grid grid-cols-2 gap-3">
              <input value={promoForm.coins} onChange={e => setPromoForm(f => ({ ...f, coins: e.target.value }))} type="number"
                placeholder="Monedas" className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
              <input value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value }))} type="number"
                placeholder="Usos máximos" className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
            </div>
            <input value={promoForm.reason} onChange={e => setPromoForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Motivo *" className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={goldStyle} />
            <button onClick={handlePromo} disabled={savingPromo}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F6B40E, #B8860B)' }}>
              {savingPromo && <Loader2 className="w-4 h-4 animate-spin" />} Crear código
            </button>
          </div>
        </div>
      </div>

      {/* Top richest */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(246, 180, 14,0.08)' }}>
          <h2 className="font-semibold text-white">Top 10 más ricos</h2>
        </div>
        <div className="table-scroll"><table className="w-full min-w-[520px] text-sm">
          <thead><tr style={{ borderBottom: '1px solid rgba(246, 180, 14,0.08)' }}>
            <th className="text-left px-5 py-2 font-medium" style={{ color: '#a89060' }}>#</th>
            <th className="text-left px-3 py-2 font-medium" style={{ color: '#a89060' }}>Usuario</th>
            <th className="text-right px-5 py-2 font-medium" style={{ color: '#a89060' }}>Monedas</th>
          </tr></thead>
          <tbody>
            {richest.map((r: { account_id: number; username: string; coins: number }, i: number) => (
              <tr key={r.account_id} style={{ borderBottom: '1px solid rgba(246, 180, 14,0.05)' }}>
                <td className="px-5 py-2.5 text-sm" style={{ color: '#a89060' }}>#{i + 1}</td>
                <td className="px-3 py-2.5 text-white font-medium">{r.username || `#${r.account_id}`}</td>
                <td className="px-5 py-2.5 text-right font-bold" style={{ color: '#F6B40E' }}>{r.coins.toLocaleString()} 🪙</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
