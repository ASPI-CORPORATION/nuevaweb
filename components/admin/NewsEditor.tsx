'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Eye, PenLine, Loader2, Send, Save, Pin, ExternalLink, Calendar, User } from 'lucide-react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { ImageUploadField } from '@/components/editor/ImageUploadField'
import { NEWS_CATEGORIES, NEWS_CATEGORY_STYLE, slugify, type NewsCategory } from '@/lib/content-config'
import { notify } from '@/components/ui/toaster'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'

export interface NewsForm {
  title: string
  slug: string
  excerpt: string
  content: string
  image: string
  category: NewsCategory
  published: boolean
  pinned: boolean
}

export const EMPTY_NEWS: NewsForm = {
  title: '', slug: '', excerpt: '', content: '', image: '', category: 'Actualizaciones', published: false, pinned: false,
}

interface Props {
  editId: number | null
  initial: NewsForm
  meta?: { author?: string; createdAt?: string; updatedAt?: string }
  onClose: () => void
  onSaved: () => void
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors'

export function NewsEditor({ editId, initial, meta, onClose, onSaved }: Props) {
  const [form, setForm] = useState<NewsForm>(initial)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null)
  const [error, setError] = useState('')
  const [slugTouched, setSlugTouched] = useState(!!editId)
  const [confirmClose, setConfirmClose] = useState(false)
  const [savedSlug, setSavedSlug] = useState<string | null>(initial.published ? initial.slug : null)
  const [baseline, setBaseline] = useState(JSON.stringify(initial))

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const set = <K extends keyof NewsForm>(k: K, v: NewsForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const requestClose = () => (dirty ? setConfirmClose(true) : onClose())

  const save = async (publish: boolean) => {
    setError('')
    if (form.title.trim().length < 3) { setError('El título debe tener al menos 3 caracteres.'); setTab('edit'); return }
    setSaving(publish ? 'publish' : 'draft')
    try {
      const payload = { ...form, published: publish, slug: form.slug || slugify(form.title) }
      const res = await fetch(editId ? `/api/admin/news/${editId}` : '/api/admin/news', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status} al guardar`)
        notify.error(data.error || 'No se pudo guardar la noticia')
        return
      }
      const saved = { ...payload, slug: data.slug ?? payload.slug }
      setForm(saved)
      setBaseline(JSON.stringify(saved))
      setSavedSlug(publish ? saved.slug : null)
      notify.success(publish ? 'Noticia publicada. Ya es visible en la web.' : 'Borrador guardado. No es visible públicamente.')
      onSaved()
      if (!editId) onClose()
    } catch {
      setError('Error de red. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setSaving(null)
    }
  }

  const cat = NEWS_CATEGORY_STYLE[form.category]

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={editId ? 'Editar noticia' : 'Nueva noticia'}>
      <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={requestClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-[#0A1628] sm:rounded-2xl border-white/10 sm:border shadow-2xl"
      >
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <h2 className="font-['Cinzel'] font-bold text-lg text-white truncate">{editId ? 'Editar noticia' : 'Nueva noticia'}</h2>
            <p className="text-xs text-slate-500">
              {form.published ? <span className="text-green-400">Publicada</span> : <span>Borrador</span>}
              {dirty && <span className="text-[#F6B40E]"> · cambios sin guardar</span>}
            </p>
          </div>
          <div className="flex rounded-lg bg-white/5 p-0.5 text-sm">
            <button onClick={() => setTab('edit')} aria-label="Editar" aria-pressed={tab === 'edit'} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${tab === 'edit' ? 'bg-[#74ACDF] text-[#050A14] font-semibold' : 'text-slate-300'}`}>
              <PenLine className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editar</span>
            </button>
            <button onClick={() => setTab('preview')} aria-label="Vista previa" aria-pressed={tab === 'preview'} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${tab === 'preview' ? 'bg-[#74ACDF] text-[#050A14] font-semibold' : 'text-slate-300'}`}>
              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Vista previa</span>
            </button>
          </div>
          <button onClick={requestClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Cerrar editor">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">{error}</div>
          )}

          {tab === 'edit' ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4 min-w-0">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Título</span>
                  <input
                    value={form.title}
                    onChange={e => {
                      const title = e.target.value
                      setForm(f => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }))
                    }}
                    placeholder="Ej: Llegó la temporada 9 de arenas"
                    className={`${inputCls} mt-1.5 text-base font-semibold`}
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Resumen <span className="text-slate-500 font-normal">(opcional — si queda vacío se genera solo)</span></span>
                  <textarea
                    value={form.excerpt}
                    onChange={e => set('excerpt', e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Una o dos oraciones que aparecen en las tarjetas de noticias"
                    className={`${inputCls} mt-1.5 resize-y`}
                  />
                  <span className="block text-right text-xs text-slate-500 mt-1">{form.excerpt.length}/500</span>
                </label>
                <div>
                  <span className="text-sm font-medium text-slate-300">Contenido</span>
                  <div className="mt-1.5">
                    <RichTextEditor
                      value={form.content}
                      onChange={html => set('content', html)}
                      onNormalize={html => {
                        setForm(f => {
                          const next = { ...f, content: html }
                          setBaseline(b => JSON.stringify({ ...JSON.parse(b), content: html }))
                          return next
                        })
                      }}
                      placeholder="Contá la novedad a la comunidad…"
                    />
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Categoría</span>
                  <select value={form.category} onChange={e => set('category', e.target.value as NewsCategory)} className={`${inputCls} mt-1.5`}>
                    {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{NEWS_CATEGORY_STYLE[c].label}</option>)}
                  </select>
                </label>
                <ImageUploadField label="Imagen de portada" value={form.image} onChange={v => set('image', v)} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">URL (slug)</span>
                  <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-[#0A1628] focus-within:border-[#74ACDF]/60">
                    <span className="pl-3 text-xs text-slate-500 shrink-0">/news/</span>
                    <input
                      value={form.slug}
                      onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)) }}
                      className="w-full min-w-0 bg-transparent! border-0! px-1.5 py-2.5 text-sm outline-none shadow-none!"
                      placeholder="se-genera-del-titulo"
                    />
                  </div>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3.5 py-3 cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-slate-200"><Pin className="w-4 h-4 text-[#F6B40E]" /> Fijar como destacada</span>
                  <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} className="w-4 h-4" />
                </label>
                {meta && (meta.author || meta.createdAt) && (
                  <div className="rounded-xl border border-white/10 px-3.5 py-3 text-xs text-slate-400 space-y-1">
                    {meta.author && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {meta.author}</div>}
                    {meta.createdAt && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Creada {new Date(meta.createdAt).toLocaleString('es-AR')}</div>}
                    {meta.updatedAt && <div className="pl-5">Editada {new Date(meta.updatedAt).toLocaleString('es-AR')}</div>}
                  </div>
                )}
              </aside>
            </div>
          ) : (
            <article className="max-w-3xl mx-auto">
              {form.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image} alt="" className="w-full aspect-[16/9] object-cover rounded-2xl border border-white/10 mb-6" />
              )}
              <span className="inline-block text-xs px-2.5 py-1 rounded-full border font-medium mb-3" style={{ color: cat.color, borderColor: `${cat.color}40`, background: `${cat.color}14` }}>
                {cat.label}
              </span>
              <h1 className="font-['Cinzel'] font-black text-2xl sm:text-4xl text-white mb-3 break-words">{form.title || 'Sin título'}</h1>
              {form.excerpt && <p className="text-slate-400 mb-6">{form.excerpt}</p>}
              {form.content
                ? <div className="prose-ar" dangerouslySetInnerHTML={{ __html: form.content }} />
                : <p className="text-slate-500 italic">Todavía no escribiste contenido.</p>}
            </article>
          )}
        </div>

        <footer className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 px-4 sm:px-6 py-3 border-t border-white/10 bg-[#0A1628] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {savedSlug && form.published && (
            <a href={`/news/${savedSlug}`} target="_blank" rel="noopener" className="text-sm text-[#74ACDF] hover:underline inline-flex items-center gap-1.5 sm:mr-auto justify-center">
              <ExternalLink className="w-4 h-4" /> Ver publicación
            </a>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <button onClick={() => save(false)} disabled={!!saving} className="btn-ghost flex-1 sm:flex-none">
              {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {form.published ? 'Pasar a borrador' : 'Guardar borrador'}
            </button>
            <button onClick={() => save(true)} disabled={!!saving} className="btn-gold flex-1 sm:flex-none">
              {saving === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {form.published ? 'Actualizar' : 'Publicar'}
            </button>
          </div>
        </footer>
      </motion.div>

      <ConfirmDialog
        open={confirmClose}
        title="¿Descartar cambios?"
        message="Tenés cambios sin guardar en esta noticia."
        confirmLabel="Descartar"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  )
}
