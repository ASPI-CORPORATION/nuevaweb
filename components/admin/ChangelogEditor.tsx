'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Eye, PenLine, Loader2, Send, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { ImageUploadField } from '@/components/editor/ImageUploadField'
import { ChangelogCard } from '@/components/changelog/ChangelogCard'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { notify } from '@/components/ui/toaster'
import { CHANGELOG_CATEGORIES, CHANGELOG_CATEGORY_STYLE, type ChangelogCategory } from '@/lib/content-config'

export interface ChangelogForm {
  version: string
  title: string
  date: string
  type: 'Mayor' | 'Menor' | 'Hotfix'
  category: ChangelogCategory
  image: string
  summary: string
  content: string
  published: boolean
  changes: Array<{ type: ChangelogCategory; text: string }>
}

export function emptyChangelog(): ChangelogForm {
  const d = new Date()
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return {
    version: '', title: '', date: local, type: 'Menor', category: 'Nuevo', image: '', summary: '', content: '',
    published: true, changes: [{ type: 'Nuevo', text: '' }],
  }
}

interface Props {
  editId: number | null
  initial: ChangelogForm
  extended: boolean
  onClose: () => void
  onSaved: () => void
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none'

export function ChangelogEditor({ editId, initial, extended, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ChangelogForm>(initial)
  const [baseline, setBaseline] = useState(JSON.stringify(initial))
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null)
  const [error, setError] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const set = <K extends keyof ChangelogForm>(k: K, v: ChangelogForm[K]) => setForm(f => ({ ...f, [k]: v }))
  const setChange = (i: number, patch: Partial<ChangelogForm['changes'][number]>) =>
    setForm(f => ({ ...f, changes: f.changes.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))
  const moveChange = (i: number, dir: -1 | 1) =>
    setForm(f => {
      const j = i + dir
      if (j < 0 || j >= f.changes.length) return f
      const changes = [...f.changes]
      ;[changes[i], changes[j]] = [changes[j], changes[i]]
      return { ...f, changes }
    })

  const save = async (publish: boolean) => {
    setError('')
    setSaving(publish ? 'publish' : 'draft')
    try {
      const payload = { ...form, published: publish }
      const res = await fetch(editId ? `/api/admin/changelog/${editId}` : '/api/admin/changelog', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status} al guardar`)
        notify.error(data.error || 'No se pudo guardar el changelog')
        return
      }
      setForm(payload)
      setBaseline(JSON.stringify(payload))
      notify.success(publish ? 'Actualización publicada en /changelog' : 'Borrador guardado (no visible públicamente)')
      onSaved()
      onClose()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={editId ? 'Editar actualización' : 'Nueva actualización'}>
      <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => (dirty ? setConfirmClose(true) : onClose())} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-[#0A1628] sm:rounded-2xl sm:border border-white/10 shadow-2xl"
      >
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <h2 className="font-['Cinzel'] font-bold text-lg text-white truncate">{editId ? 'Editar actualización' : 'Nueva actualización'}</h2>
            {dirty && <p className="text-xs text-[#F6B40E]">Cambios sin guardar</p>}
          </div>
          <div className="flex rounded-lg bg-white/5 p-0.5 text-sm">
            <button onClick={() => setTab('edit')} aria-label="Editar" aria-pressed={tab === 'edit'} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${tab === 'edit' ? 'bg-[#74ACDF] text-[#050A14] font-semibold' : 'text-slate-300'}`}>
              <PenLine className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editar</span>
            </button>
            <button onClick={() => setTab('preview')} aria-label="Vista previa" aria-pressed={tab === 'preview'} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${tab === 'preview' ? 'bg-[#74ACDF] text-[#050A14] font-semibold' : 'text-slate-300'}`}>
              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Vista previa</span>
            </button>
          </div>
          <button onClick={() => (dirty ? setConfirmClose(true) : onClose())} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Cerrar editor">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">
          {!extended && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-[#F6B40E]/30 bg-[#F6B40E]/10 text-sm text-[#ffe08a]">
              La base todavía no tiene las columnas nuevas. Podés crear y editar actualizaciones con su lista de cambios;
              para imágenes, resumen, notas y borradores ejecutá <code>migrations/2026_11_changelog_imagenes.sql</code>.
            </div>
          )}
          {error && <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">{error}</div>}

          {tab === 'edit' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block col-span-1">
                  <span className="text-sm font-medium text-slate-300">Versión</span>
                  <input value={form.version} onChange={e => set('version', e.target.value)} placeholder="3.2.0" maxLength={20} className={`${inputCls} mt-1.5 font-mono`} />
                </label>
                <label className="block col-span-1">
                  <span className="text-sm font-medium text-slate-300">Fecha</span>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={`${inputCls} mt-1.5`} />
                </label>
                <label className="block col-span-1">
                  <span className="text-sm font-medium text-slate-300">Tipo</span>
                  <select value={form.type} onChange={e => set('type', e.target.value as ChangelogForm['type'])} className={`${inputCls} mt-1.5`}>
                    <option value="Mayor">Mayor</option>
                    <option value="Menor">Menor</option>
                    <option value="Hotfix">Hotfix</option>
                  </select>
                </label>
                <label className="block col-span-1">
                  <span className="text-sm font-medium text-slate-300">Categoría</span>
                  <select value={form.category} onChange={e => set('category', e.target.value as ChangelogCategory)} className={`${inputCls} mt-1.5`}>
                    {CHANGELOG_CATEGORIES.map(c => <option key={c} value={c}>{CHANGELOG_CATEGORY_STYLE[c].label}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">Título</span>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Llega la Ciudadela de la Corona de Hielo" maxLength={200} className={`${inputCls} mt-1.5 text-base font-semibold`} />
              </label>

              <div className={`grid gap-5 lg:grid-cols-2 ${extended ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!extended}>
                <ImageUploadField label="Imagen de portada" value={form.image} onChange={v => set('image', v)} />
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Resumen</span>
                  <textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={5} maxLength={500} placeholder="Qué trae esta actualización, en dos líneas" className={`${inputCls} mt-1.5 resize-y`} />
                  <span className="block text-right text-xs text-slate-500 mt-1">{form.summary.length}/500</span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Lista de cambios</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, changes: [...f.changes, { type: f.category, text: '' }] }))} className="text-sm text-[#74ACDF] inline-flex items-center gap-1 hover:underline">
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.changes.map((c, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 rounded-xl border border-white/10 p-2 sm:p-0 sm:border-0">
                      <select value={c.type} onChange={e => setChange(i, { type: e.target.value as ChangelogCategory })} aria-label={`Tipo del cambio ${i + 1}`} className="sm:w-36 px-3 py-2 rounded-lg border text-sm outline-none">
                        {CHANGELOG_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input value={c.text} onChange={e => setChange(i, { text: e.target.value })} placeholder="Describí el cambio" maxLength={500} aria-label={`Texto del cambio ${i + 1}`} className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm outline-none" />
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => moveChange(i, -1)} disabled={i === 0} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30" aria-label="Subir"><ArrowUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => moveChange(i, 1)} disabled={i === form.changes.length - 1} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30" aria-label="Bajar"><ArrowDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, changes: f.changes.filter((_, j) => j !== i) }))} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400" aria-label="Quitar cambio"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {form.changes.length === 0 && <p className="text-sm text-slate-500">Sin cambios en la lista.</p>}
                </div>
              </div>

              <div className={extended ? '' : 'opacity-50 pointer-events-none'} aria-disabled={!extended}>
                <span className="text-sm font-medium text-slate-300">Notas completas <span className="text-slate-500 font-normal">(opcional — admite imágenes)</span></span>
                <div className="mt-1.5">
                  <RichTextEditor
                    value={form.content}
                    onChange={html => set('content', html)}
                    onNormalize={html => { setForm(f => ({ ...f, content: html })); setBaseline(b => JSON.stringify({ ...JSON.parse(b), content: html })) }}
                    minHeight={180}
                    placeholder="Detalles, capturas, notas para los jugadores…"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <ChangelogCard
                featured
                entry={{ ...form, version: form.version || '0.0.0', title: form.title || 'Sin título', image: form.image || null, summary: form.summary || null, changes: form.changes.filter(c => c.text.trim()) }}
                contentHtml={form.content || null}
              />
            </div>
          )}
        </div>

        <footer className="flex gap-2 px-4 sm:px-6 py-3 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button onClick={() => save(false)} disabled={!!saving || !extended} title={extended ? undefined : 'Requiere la migración'} className="btn-ghost flex-1 sm:flex-none sm:ml-auto">
            {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar borrador
          </button>
          <button onClick={() => save(true)} disabled={!!saving} className="btn-gold flex-1 sm:flex-none">
            {saving === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {editId && initial.published ? 'Actualizar' : 'Publicar'}
          </button>
        </footer>
      </motion.div>

      <ConfirmDialog open={confirmClose} title="¿Descartar cambios?" message="Tenés cambios sin guardar." confirmLabel="Descartar" danger onConfirm={onClose} onCancel={() => setConfirmClose(false)} />
    </div>
  )
}
