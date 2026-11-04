'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
type ChangeType = 'NUEVO' | 'FIX' | 'BALANCE' | 'EVENTO'
type EntryType = 'patch' | 'update' | 'hotfix' | 'event'

const TYPE_BADGE: Record<ChangeType, string> = {
  NUEVO: 'bg-green-500/15 text-green-400 border-green-500/25',
  FIX: 'bg-red-500/15 text-red-400 border-red-500/25',
  BALANCE: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  EVENTO: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
}

const emptyForm = { version: '', title: '', date: new Date().toISOString().slice(0, 10), type: 'patch' as EntryType, changes: [{ type: 'NUEVO' as ChangeType, text: '' }] }

export default function AdminChangelogPage() {
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { data, mutate } = useSWR('/api/admin/changelog', fetcher)
  const entries = data?.entries ?? []

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(''); setModal(true) }

  const openEdit = (e: { id: number; version: string; title: string; date: string; type: EntryType; changes: string }) => {
    setEditId(e.id)
    setForm({ version: e.version, title: e.title, date: e.date.slice(0, 10), type: e.type, changes: JSON.parse(e.changes) })
    setError('')
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    const url = editId ? `/api/admin/changelog/${editId}` : '/api/admin/changelog'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    mutate(); setModal(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    await fetch(`/api/admin/changelog/${id}`, { method: 'DELETE' })
    mutate()
  }

  const addChange = () => setForm(f => ({ ...f, changes: [...f.changes, { type: 'NUEVO' as ChangeType, text: '' }] }))
  const removeChange = (i: number) => setForm(f => ({ ...f, changes: f.changes.filter((_, j) => j !== i) }))
  const updateChange = (i: number, field: 'type' | 'text', value: string) =>
    setForm(f => ({ ...f, changes: f.changes.map((c, j) => j === i ? { ...c, [field]: value } : c) }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Cinzel'] font-black text-3xl text-white">Changelog</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva entrada
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((e: { id: number; version: string; title: string; date: string; type: EntryType; changes: string }) => (
          <div key={e.id} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-400 font-bold font-mono text-sm">v{e.version}</span>
                  <span className="font-semibold text-white">{e.title}</span>
                  <span className="text-xs text-slate-500">{e.date?.slice(0, 10)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(JSON.parse(e.changes || '[]') as { type: ChangeType; text: string }[]).slice(0, 3).map((c, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded border ${TYPE_BADGE[c.type]}`}>{c.type}</span>
                  ))}
                  {(JSON.parse(e.changes || '[]') as []).length > 3 && (
                    <span className="text-xs text-slate-500">+{(JSON.parse(e.changes || '[]') as []).length - 3} más</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(e)} className="p-1.5 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4 text-blue-400" /></button>
                <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && <div className="text-center py-8 text-slate-500">No hay entradas</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-['Cinzel'] font-bold text-xl text-white mb-5">{editId ? 'Editar entrada' : 'Nueva entrada'}</h2>
            {error && <div className="mb-4 px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm">{error}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  placeholder="Versión (ej: 1.0.1)" className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
              </div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Título de la versión" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EntryType }))}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm">
                <option value="patch">Parche</option>
                <option value="update">Actualización</option>
                <option value="hotfix">Hotfix</option>
                <option value="event">Evento</option>
              </select>

              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-medium">Cambios</div>
                {form.changes.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={c.type} onChange={e => updateChange(i, 'type', e.target.value)}
                      className="px-2 py-2 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-xs w-28">
                      {(['NUEVO', 'FIX', 'BALANCE', 'EVENTO'] as ChangeType[]).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={c.text} onChange={e => updateChange(i, 'text', e.target.value)}
                      placeholder="Descripción del cambio" className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
                    <button onClick={() => removeChange(i)} className="p-2 hover:bg-slate-700 rounded-lg text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={addChange} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Agregar cambio
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50 transition-colors text-sm">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Guardar' : 'Crear'}
              </button>
              <button onClick={() => setModal(false)} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
