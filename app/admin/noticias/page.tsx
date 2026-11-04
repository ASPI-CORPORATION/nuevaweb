'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash2, Eye, EyeOff, Pin, Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORIES = ['Actualización', 'Evento', 'Mantenimiento', 'Comunidad', 'PvP'] as const
type Category = typeof CATEGORIES[number]

interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string
  category: string
  published: number
  pinned: number
  views: number
  created_at: string
  author_name: string
}

const emptyForm = { title: '', slug: '', excerpt: '', content: '', image: '', category: 'Actualización' as Category, published: false, pinned: false }

export default function AdminNoticiasPage() {
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data, mutate } = useSWR(`/api/admin/news?page=${page}`, fetcher)
  const news: NewsItem[] = data?.news ?? []
  const total = data?.total ?? 0

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 100)

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setError('')
    setModal(true)
  }

  const openEdit = async (item: NewsItem) => {
    const res = await fetch(`/api/admin/news/${item.id}`).then(r => r.json())
    const n = res.news
    setForm({
      title: n.title, slug: n.slug, excerpt: n.excerpt, content: n.content,
      image: n.image ?? '', category: n.category, published: !!n.published, pinned: !!n.pinned,
    })
    setEditId(item.id)
    setError('')
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const url = editId ? `/api/admin/news/${editId}` : '/api/admin/news'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      mutate()
      setModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta noticia?')) return
    await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
    mutate()
  }

  const toggleField = async (id: number, field: 'published' | 'pinned', current: number) => {
    await fetch(`/api/admin/news/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Cinzel'] font-black text-3xl text-white">Noticias</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva noticia
        </button>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Título</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Categoría</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Estado</th>
              <th className="text-left px-3 py-3 text-slate-400 font-medium">Vistas</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {news.map(item => (
              <tr key={item.id} className="hover:bg-slate-800/20">
                <td className="px-5 py-3">
                  <div className="font-medium text-white line-clamp-1">{item.title}</div>
                  <div className="text-xs text-slate-500">{format(new Date(item.created_at), 'd MMM yyyy', { locale: es })} · {item.author_name}</div>
                </td>
                <td className="px-3 py-3 text-slate-300">{item.category}</td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${item.published ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-slate-400 border-slate-600/40 bg-slate-700/30'}`}>
                    {item.published ? 'Publicada' : 'Borrador'}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-400">{item.views}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleField(item.id, 'published', item.published)} title={item.published ? 'Despublicar' : 'Publicar'} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                      {item.published ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                    </button>
                    <button onClick={() => toggleField(item.id, 'pinned', item.pinned)} title={item.pinned ? 'Desfijar' : 'Fijar'} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                      <Pin className={`w-4 h-4 ${item.pinned ? 'text-yellow-400' : 'text-slate-500'}`} />
                    </button>
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {news.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-500">No hay noticias</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-['Cinzel'] font-bold text-xl text-white mb-5">{editId ? 'Editar noticia' : 'Nueva noticia'}</h2>

            {error && <div className="mb-4 px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm">{error}</div>}

            <div className="space-y-4">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: editId ? f.slug : autoSlug(e.target.value) }))}
                placeholder="Título" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="Slug (ej: nuevo-parche)" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
              <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                placeholder="URL de imagen (opcional)" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                placeholder="Resumen (máx 500 caracteres)" rows={2}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm resize-none" />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Contenido (HTML permitido)" rows={8}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-purple-500 text-sm resize-none font-mono" />
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="accent-purple-500" />
                  Publicar ahora
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="accent-yellow-500" />
                  Fijar
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50 transition-colors text-sm">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Guardar cambios' : 'Crear noticia'}
              </button>
              <button onClick={() => setModal(false)} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
