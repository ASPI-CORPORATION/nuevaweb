'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { fetcher, inputCls } from '@/components/gm/ui'

interface Tpl { id: number; label: string; body: string; sort_order: number }

/** GM 3 only (the API enforces it): create, edit and delete quick replies. */
export function TemplateManager({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, mutate } = useSWR(open ? '/api/gm/templates' : null, fetcher)
  const [edit, setEdit] = useState<null | { id: number | null; label: string; body: string }>(null)
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState<Tpl | null>(null)

  const save = async () => {
    if (!edit) return
    setBusy(true)
    const res = await fetch(edit.id ? `/api/gm/templates/${edit.id}` : '/api/gm/templates', {
      method: edit.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: edit.label, body: edit.body }),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    setBusy(false)
    if (!res?.ok) { notify.error('No se pudo guardar la plantilla', d?.error); return }
    notify.success(edit.id ? 'Plantilla actualizada' : 'Plantilla creada', `"${edit.label}" ya está disponible para todos los GM.`)
    setEdit(null); mutate(); onChanged()
  }

  const remove = async () => {
    if (!toDelete) return
    setBusy(true)
    const res = await fetch(`/api/gm/templates/${toDelete.id}`, { method: 'DELETE' }).catch(() => null)
    setBusy(false)
    if (!res?.ok) { notify.error('No se pudo eliminar la plantilla'); return }
    notify.success('Plantilla eliminada', `"${toDelete.label}" fue eliminada.`)
    setToDelete(null); mutate(); onChanged()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Plantillas de respuesta">
          <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="relative w-full sm:max-w-2xl max-h-[92svh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#F6B40E]/25 bg-[#0A1628] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Cinzel'] font-bold text-lg text-white">Plantillas de respuesta</h2>
              <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Variables: <code>{'{gm.username}'}</code>, <code>{'{player.username}'}</code>, <code>{'{ticket.id}'}</code>.</p>

            {edit ? (
              <div className="space-y-3">
                <input value={edit.label} onChange={e => setEdit({ ...edit, label: e.target.value })} maxLength={40} placeholder="Nombre del botón" className={inputCls} />
                <textarea value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} rows={6} maxLength={2000} placeholder="Texto de la respuesta" className={`${inputCls} resize-y`} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEdit(null)} className="btn-ghost">Cancelar</button>
                  <button onClick={save} disabled={busy} className="btn-gold">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => setEdit({ id: null, label: '', body: '' })} className="btn-gold mb-3 w-full sm:w-auto"><Plus className="w-4 h-4" /> Nueva plantilla</button>
                <ul className="space-y-2">
                  {(data?.templates as Tpl[] | undefined)?.map(t => (
                    <li key={t.id} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#ffe08a]">{t.label}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setEdit({ id: t.id, label: t.label, body: t.body })} className="p-1.5 rounded-lg hover:bg-white/10" aria-label={`Editar ${t.label}`}><Pencil className="w-4 h-4 text-[#74ACDF]" /></button>
                          <button onClick={() => setToDelete(t)} className="p-1.5 rounded-lg hover:bg-red-500/10" aria-label={`Eliminar ${t.label}`}><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{t.body}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
          <ConfirmDialog open={!!toDelete} danger title="Eliminar plantilla" message={`¿Eliminar "${toDelete?.label}"?`} confirmLabel="Eliminar" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
        </div>
      )}
    </AnimatePresence>
  )
}
