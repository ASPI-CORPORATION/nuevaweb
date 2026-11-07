'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
type ShopCategory = 'Montura' | 'Mascota' | 'Cosmético' | 'Título' | 'Servicio' | 'Otro'
const CATS: ShopCategory[] = ['Montura', 'Mascota', 'Cosmético', 'Título', 'Servicio', 'Otro']

interface ShopItem {
  id: number; item_entry: number; name: string; description: string | null
  price_coins: number; category: string; image: string | null; active: number; stock: number
}

const emptyForm = { item_entry: '', name: '', description: '', price_coins: '', category: 'Montura' as ShopCategory, image: '', active: true, stock: '-1' }

export default function AdminTiendaPage() {
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { data, mutate } = useSWR('/api/admin/shop', fetcher)
  const items: ShopItem[] = data?.items ?? []

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(''); setModal(true) }
  const openEdit = (item: ShopItem) => {
    setEditId(item.id)
    setForm({ item_entry: String(item.item_entry), name: item.name, description: item.description ?? '', price_coins: String(item.price_coins), category: item.category as ShopCategory, image: item.image ?? '', active: !!item.active, stock: String(item.stock) })
    setError(''); setModal(true)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = { item_entry: parseInt(form.item_entry), name: form.name, description: form.description, price_coins: parseInt(form.price_coins), category: form.category, image: form.image, active: form.active, stock: parseInt(form.stock) }
    const url = editId ? `/api/admin/shop/${editId}` : '/api/admin/shop'
    const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    mutate(); setModal(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este item de la tienda?')) return
    await fetch(`/api/admin/shop/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Cinzel'] font-black text-3xl text-white">Tienda</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#74ACDF] hover:bg-[#8cc0ec] text-[#050A14] font-semibold rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo item
        </button>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="table-scroll"><table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Item</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Entry</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Precio</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Stock</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Estado</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-800/20">
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.category}</div>
                </td>
                <td className="px-3 py-3 text-slate-400 font-mono">{item.item_entry}</td>
                <td className="px-3 py-3 text-yellow-400 font-medium">{item.price_coins} 🪙</td>
                <td className="px-3 py-3 text-slate-300">{item.stock === -1 ? '∞' : item.stock}</td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${item.active ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-slate-400 border-slate-600 bg-slate-700/30'}`}>
                    {item.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4 text-blue-400" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-500">No hay items en la tienda</td></tr>}
          </tbody>
        </table></div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90svh] overflow-y-auto overscroll-contain">
            <h2 className="font-['Cinzel'] font-bold text-xl text-white mb-5">{editId ? 'Editar item' : 'Nuevo item'}</h2>
            {error && <div className="mb-4 px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.item_entry} onChange={e => setForm(f => ({ ...f, item_entry: e.target.value }))} placeholder="Item Entry (ID)" className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
                <input value={form.price_coins} onChange={e => setForm(f => ({ ...f, price_coins: e.target.value }))} placeholder="Precio (monedas)" className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
              </div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del item" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción" rows={2} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm resize-none" />
              <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="URL imagen (opcional)" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ShopCategory }))} className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm">
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Stock (-1 = infinito)" className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-[#74ACDF]" /> Activo (visible en tienda)
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#74ACDF] hover:bg-[#8cc0ec] text-[#050A14] font-semibold rounded-xl font-medium disabled:opacity-50 transition-colors text-sm">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Guardar' : 'Crear'}
              </button>
              <button onClick={() => setModal(false)} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
