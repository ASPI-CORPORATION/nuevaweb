'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash2, Eye, EyeOff, Pin, Search, Newspaper, Loader2, ExternalLink } from 'lucide-react'
import { NewsEditor, EMPTY_NEWS, type NewsForm } from '@/components/admin/NewsEditor'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { notify } from '@/components/ui/toaster'
import { NEWS_CATEGORY_STYLE, type NewsCategory } from '@/lib/content-config'

interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  category: string
  published: number
  pinned: number
  views: number
  created_at: string
  updated_at: string
  author_name: string | null
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
  return data
}

const STATUS_TABS = [
  { key: '', label: 'Todas' },
  { key: 'published', label: 'Publicadas' },
  { key: 'draft', label: 'Borradores' },
] as const

export default function AdminNoticiasPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<null | { id: number | null; form: NewsForm; meta?: { author?: string; createdAt?: string; updatedAt?: string } }>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [toDelete, setToDelete] = useState<NewsItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)
  if (query) params.set('q', query)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/news?${params}`, fetcher)
  const news: NewsItem[] = data?.news ?? []
  const total: number = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)))

  const openEdit = async (item: NewsItem) => {
    setLoadingId(item.id)
    try {
      const res = await fetcher(`/api/admin/news/${item.id}`)
      const n = res.news
      setEditor({
        id: item.id,
        form: {
          title: n.title, slug: n.slug, excerpt: n.excerpt ?? '', content: n.content ?? '',
          image: n.image && n.image !== '/images/news/default.jpg' ? n.image : '',
          category: n.category as NewsCategory, published: !!n.published, pinned: !!n.pinned,
        },
        meta: { author: n.author_name ?? undefined, createdAt: n.created_at, updatedAt: n.updated_at },
      })
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo abrir la noticia')
    } finally {
      setLoadingId(null)
    }
  }

  const patch = async (item: NewsItem, body: Record<string, unknown>, okMsg: string) => {
    const res = await fetch(`/api/admin/news/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) notify.error(d.error || 'No se pudo actualizar')
    else notify.success(okMsg)
    mutate()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const res = await fetch(`/api/admin/news/${toDelete.id}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    setDeleting(false)
    if (!res.ok) { notify.error(d.error || 'No se pudo eliminar'); return }
    notify.success('Noticia eliminada')
    setToDelete(null)
    mutate()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Contenido</span>
          <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white mt-1">Noticias</h1>
          <p className="text-sm text-slate-400">Creá, editá y publicá noticias. Los borradores nunca se muestran en la web.</p>
        </div>
        <button onClick={() => setEditor({ id: null, form: EMPTY_NEWS })} className="btn-gold w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Nueva noticia
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-xl bg-white/5 p-1 text-sm overflow-x-auto">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => { setStatus(t.key); setPage(1) }}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap ${status === t.key ? 'bg-[#74ACDF] text-[#050A14] font-semibold' : 'text-slate-300 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <form className="relative flex-1" onSubmit={e => { e.preventDefault(); setQuery(q.trim()); setPage(1) }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por título…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none" />
        </form>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          No se pudieron cargar las noticias: {error.message}
        </div>
      )}

      <div className="panel-card divide-y divide-white/5 overflow-hidden">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 m-3 skeleton" />)}

        {!isLoading && news.map(item => {
          const cat = NEWS_CATEGORY_STYLE[item.category] ?? NEWS_CATEGORY_STYLE.General
          return (
            <div key={item.id} className="flex flex-col sm:flex-row gap-3 sm:items-center p-3 sm:p-4">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#101F35] to-[#0A1628] border border-white/10">
                  {item.image && item.image !== '/images/news/default.jpg' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ color: cat.color, borderColor: `${cat.color}40` }}>{cat.label}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${item.published ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-slate-400 border-slate-500/30 bg-slate-500/10'}`}>
                      {item.published ? 'Publicada' : 'Borrador'}
                    </span>
                    {!!item.pinned && <span className="text-[11px] px-2 py-0.5 rounded-full border text-[#F6B40E] border-[#F6B40E]/30 inline-flex items-center gap-1"><Pin className="w-3 h-3" /> Destacada</span>}
                  </div>
                  <div className="font-semibold text-white line-clamp-2 sm:line-clamp-1 break-words">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(item.created_at), "d MMM yyyy HH:mm", { locale: es })} · {item.author_name || 'Staff'} · {item.views} vistas
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 justify-end border-t border-white/5 pt-2 sm:border-0 sm:pt-0">
                {!!item.published && (
                  <a href={`/news/${item.slug}`} target="_blank" rel="noopener" title="Ver en la web" className="p-2 rounded-lg hover:bg-white/10 text-slate-400"><ExternalLink className="w-4 h-4" /></a>
                )}
                <button onClick={() => patch(item, { published: !item.published }, item.published ? 'Noticia despublicada' : 'Noticia publicada')}
                  title={item.published ? 'Despublicar' : 'Publicar'} className="p-2 rounded-lg hover:bg-white/10">
                  {item.published ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-green-400" />}
                </button>
                <button onClick={() => patch(item, { pinned: !item.pinned }, item.pinned ? 'Ya no está destacada' : 'Marcada como destacada')}
                  title={item.pinned ? 'Quitar destacado' : 'Destacar'} className="p-2 rounded-lg hover:bg-white/10">
                  <Pin className={`w-4 h-4 ${item.pinned ? 'text-[#F6B40E]' : 'text-slate-400'}`} />
                </button>
                <button onClick={() => openEdit(item)} title="Editar" className="p-2 rounded-lg hover:bg-white/10">
                  {loadingId === item.id ? <Loader2 className="w-4 h-4 animate-spin text-[#74ACDF]" /> : <Pencil className="w-4 h-4 text-[#74ACDF]" />}
                </button>
                <button onClick={() => setToDelete(item)} title="Eliminar" className="p-2 rounded-lg hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          )
        })}

        {!isLoading && !error && news.length === 0 && (
          <div className="text-center py-14 px-4">
            <Newspaper className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-white font-semibold">{query || status ? 'Sin resultados' : 'Todavía no hay noticias'}</p>
            <p className="text-sm text-slate-400 mt-1">{query || status ? 'Probá con otro filtro.' : 'Creá la primera para que aparezca en la portada.'}</p>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Anterior</button>
          <span className="text-slate-400">Página {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {editor && (
        <NewsEditor
          key={editor.id ?? 'new'}
          editId={editor.id}
          initial={editor.form}
          meta={editor.meta}
          onClose={() => setEditor(null)}
          onSaved={() => mutate()}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar noticia"
        message={<>Vas a eliminar <strong className="text-white">{toDelete?.title}</strong>. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
