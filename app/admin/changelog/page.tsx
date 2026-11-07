'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, ListChecks, ImageIcon } from 'lucide-react'
import { ChangelogEditor, emptyChangelog, type ChangelogForm } from '@/components/admin/ChangelogEditor'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { notify } from '@/components/ui/toaster'
import { CHANGELOG_CATEGORY_STYLE, type ChangelogCategory } from '@/lib/content-config'

interface Entry {
  id: number
  version: string
  title: string
  date: string
  type: 'Mayor' | 'Menor' | 'Hotfix'
  category: ChangelogCategory
  image: string | null
  summary: string | null
  content: string | null
  published: boolean
  changes: Array<{ type: ChangelogCategory; text: string }>
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `Error ${r.status}`)
  return d
}

function toForm(e: Entry): ChangelogForm {
  return {
    version: e.version, title: e.title, date: e.date, type: e.type, category: e.category,
    image: e.image ?? '', summary: e.summary ?? '', content: e.content ?? '', published: e.published,
    changes: e.changes.length ? e.changes : [{ type: e.category, text: '' }],
  }
}

export default function AdminChangelogPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/changelog', fetcher)
  const entries: Entry[] = data?.entries ?? []
  const extended: boolean = data?.extended ?? true
  const [editor, setEditor] = useState<null | { id: number | null; form: ChangelogForm }>(null)
  const [toDelete, setToDelete] = useState<Entry | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const toggle = async (e: Entry) => {
    setBusy(e.id)
    const res = await fetch(`/api/admin/changelog/${e.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !e.published }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) notify.error(d.error || 'No se pudo cambiar la visibilidad')
    else notify.success(e.published ? 'Pasó a borrador' : 'Publicada')
    mutate()
  }

  const remove = async () => {
    if (!toDelete) return
    setBusy(toDelete.id)
    const res = await fetch(`/api/admin/changelog/${toDelete.id}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { notify.error(d.error || 'No se pudo eliminar'); return }
    notify.success('Actualización eliminada')
    setToDelete(null)
    mutate()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Contenido</span>
          <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white mt-1">Changelog</h1>
          <p className="text-sm text-slate-400">Publicá las actualizaciones del servidor con imagen, categorías y notas.</p>
        </div>
        <button onClick={() => setEditor({ id: null, form: emptyChangelog() })} className="btn-gold w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Nueva actualización
        </button>
      </div>

      {!extended && (
        <div className="px-4 py-3 rounded-xl border border-[#F6B40E]/30 bg-[#F6B40E]/10 text-sm text-[#ffe08a]">
          Falta ejecutar <code>migrations/2026_11_changelog_imagenes.sql</code> para habilitar imágenes, resumen, notas y borradores.
          Las entradas existentes siguen visibles.
        </div>
      )}
      {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">No se pudo cargar: {error.message}</div>}

      <div className="grid gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 skeleton" />)}
        {entries.map(e => {
          const cat = CHANGELOG_CATEGORY_STYLE[e.category] ?? CHANGELOG_CATEGORY_STYLE.Nuevo
          return (
            <div key={e.id} className="panel-card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="w-20 h-14 sm:w-24 sm:h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-[#101F35] to-[#050A14] flex items-center justify-center">
                  {e.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={e.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-5 h-5 text-slate-600" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-mono text-sm font-bold text-[#F6B40E]">v{e.version}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ color: cat.color, borderColor: `${cat.color}40` }}>{cat.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400">{e.type}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${e.published ? 'text-green-400 border-green-500/30' : 'text-slate-400 border-slate-500/30'}`}>{e.published ? 'Publicada' : 'Borrador'}</span>
                  </div>
                  <div className="font-semibold text-white line-clamp-2 sm:line-clamp-1 break-words">{e.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5"><ListChecks className="w-3.5 h-3.5" /> {e.changes.length} cambios · {e.date}</div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 border-t border-white/5 pt-2 sm:border-0 sm:pt-0">
                {extended && (
                  <button onClick={() => toggle(e)} disabled={busy === e.id} title={e.published ? 'Pasar a borrador' : 'Publicar'} className="p-2 rounded-lg hover:bg-white/10">
                    {busy === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : e.published ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-green-400" />}
                  </button>
                )}
                <button onClick={() => setEditor({ id: e.id, form: toForm(e) })} title="Editar" className="p-2 rounded-lg hover:bg-white/10"><Pencil className="w-4 h-4 text-[#74ACDF]" /></button>
                <button onClick={() => setToDelete(e)} title="Eliminar" className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          )
        })}
        {!isLoading && !error && entries.length === 0 && (
          <div className="panel-card text-center py-14 px-4">
            <ListChecks className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-white font-semibold">Todavía no hay actualizaciones</p>
            <p className="text-sm text-slate-400 mt-1">Creá la primera para que aparezca en /changelog.</p>
          </div>
        )}
      </div>

      {editor && (
        <ChangelogEditor key={editor.id ?? 'new'} editId={editor.id} initial={editor.form} extended={extended} onClose={() => setEditor(null)} onSaved={() => mutate()} />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar actualización"
        message={<>Vas a eliminar <strong className="text-white">v{toDelete?.version} — {toDelete?.title}</strong>. No se puede deshacer.</>}
        confirmLabel="Eliminar"
        danger
        busy={busy === toDelete?.id}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
