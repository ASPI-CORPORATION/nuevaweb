import { MAX_UPLOAD_BYTES } from '@/lib/content-config'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const IMAGE_ACCEPT = ACCEPTED.join(',')

/** Uploads an image through the admin API. Throws an Error with a user-facing message. */
export async function uploadImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Formato no permitido. Usá JPG, PNG, WEBP o GIF.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('La imagen supera el máximo de 5 MB.')

  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo subir la imagen.')
  return data.url as string
}
