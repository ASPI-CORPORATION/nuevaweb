import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { MAX_UPLOAD_BYTES, UPLOAD_URL_PREFIX } from '@/lib/content-config'

/**
 * Uploaded images live outside /public: Next.js only serves files that existed in
 * /public at build time, so runtime uploads are streamed by /api/uploads/[file].
 */
export const UPLOAD_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage', 'uploads')
)

const TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
} as const
type Ext = keyof typeof TYPES

/** Detects the real format from magic bytes — the client-sent MIME type is never trusted. */
export function detectImageType(buf: Buffer): Ext | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  const sig = buf.toString('ascii', 0, 6)
  if (sig === 'GIF87a' || sig === 'GIF89a') return 'gif'
  return null
}

export class UploadError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export async function saveImage(buf: Buffer): Promise<{ url: string; name: string; type: string; size: number }> {
  if (buf.length === 0) throw new UploadError('El archivo está vacío')
  if (buf.length > MAX_UPLOAD_BYTES) throw new UploadError('La imagen supera el máximo de 5 MB', 413)
  const ext = detectImageType(buf)
  if (!ext) throw new UploadError('Formato no permitido. Usá JPG, PNG, WEBP o GIF', 415)

  const name = `${randomUUID()}.${ext}`
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buf, { flag: 'wx' })
  return { url: UPLOAD_URL_PREFIX + name, name, type: TYPES[ext], size: buf.length }
}

const NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/

export async function readUpload(name: string): Promise<{ data: Buffer; type: string } | null> {
  if (!NAME_RE.test(name)) return null
  const ext = name.split('.').pop() as Ext
  try {
    const data = await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name))
    return { data, type: TYPES[ext] }
  } catch {
    return null
  }
}
