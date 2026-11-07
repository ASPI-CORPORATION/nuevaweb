import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { executeCms } from '@/lib/db'
import { saveImage, UploadError } from '@/lib/uploads'
import { MAX_UPLOAD_BYTES } from '@/lib/content-config'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

export async function POST(req: NextRequest) {
  const user = await requireRole(req, 'admin')
  if (user instanceof Response) return user

  const rl = rateLimit(`upload:${user.id}`, 40, 10 * 60 * 1000)
  if (!rl.success) return NextResponse.json({ error: 'Demasiadas subidas. Esperá unos minutos.' }, { status: 429 })

  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'La imagen supera el máximo de 5 MB' }, { status: 413 })
  }

  let file: FormDataEntryValue | null
  try {
    file = (await req.formData()).get('file')
  } catch {
    return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 })
  }
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  try {
    const saved = await saveImage(Buffer.from(await file.arrayBuffer()))
    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await executeCms(
      'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
      [user.id, 'UPLOAD_IMAGE', `${user.username} subió ${saved.name} (${saved.type}, ${saved.size} bytes)`, normalizedIp]
    ).catch(() => {})
    return NextResponse.json({ success: true, url: saved.url })
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[uploads] save failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo guardar la imagen' }, { status: 500 })
  }
}
