'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Link2 } from 'lucide-react'
import { uploadImage, IMAGE_ACCEPT } from './uploadImage'
import { notify } from '@/components/ui/toaster'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  hint?: string
}

export function ImageUploadField({ label, value, onChange, hint = 'JPG, PNG, WEBP o GIF · máx. 5 MB · ideal 1600×900' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [showUrl, setShowUrl] = useState(false)

  const handle = async (file: File) => {
    setBusy(true)
    try {
      onChange(await uploadImage(file))
      notify.success('Imagen de portada subida')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo subir la imagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <button type="button" onClick={() => setShowUrl(s => !s)} className="text-xs text-[#74ACDF] hover:underline inline-flex items-center gap-1">
          <Link2 className="w-3 h-3" /> {showUrl ? 'Ocultar URL' : 'Usar URL'}
        </button>
      </div>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0A1628] aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Vista previa de portada" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/70 text-white hover:bg-black/85 inline-flex items-center gap-1.5">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} Cambiar
            </button>
            <button type="button" onClick={() => onChange('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/85 text-white hover:bg-red-600 inline-flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void handle(f)
          }}
          disabled={busy}
          className={`w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-sm transition-colors ${
            dragging ? 'border-[#74ACDF] bg-[#74ACDF]/10 text-white' : 'border-white/15 text-slate-400 hover:border-[#74ACDF]/50 hover:text-slate-200'
          }`}
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
          <span>{busy ? 'Subiendo…' : 'Tocá o arrastrá una imagen'}</span>
          <span className="text-xs text-slate-500 px-4 text-center">{hint}</span>
        </button>
      )}

      {showUrl && (
        <input
          value={value}
          onChange={e => onChange(e.target.value.trim())}
          placeholder="https://…"
          className="mt-2 w-full px-3 py-2 rounded-lg border text-sm outline-none"
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void handle(f)
        }}
      />
    </div>
  )
}
