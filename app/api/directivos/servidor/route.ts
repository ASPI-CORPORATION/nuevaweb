import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireDirectivo, logDirectivoAction } from '@/lib/directivos'
import { getServerStatus, sendAnnounce, reloadConfig } from '@/lib/soap'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

const schema = z.object({
  action: z.enum(['announce', 'reload_config', 'get_status']),
  message: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const result = await requireDirectivo(req)
  if (result instanceof Response) return result
  const directivo = result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { action, message } = parsed.data
  const ip = normalizeIP(getClientIP(req.headers)).normalizedIp

  let soapResult: { success: boolean; result: string } = { success: false, result: '' }

  if (action === 'get_status') {
    const status = await getServerStatus()
    return NextResponse.json({ success: status.online, status: `Online: ${status.online}, Players: ${status.players}, Uptime: ${status.uptime}` })
  }

  if (action === 'announce') {
    if (!message) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    soapResult = await sendAnnounce(message)
    await logDirectivoAction(directivo.id, null, 'SERVER_ANNOUNCE', `Anuncio enviado: ${message}`, ip)
  }

  if (action === 'reload_config') {
    soapResult = await reloadConfig()
    await logDirectivoAction(directivo.id, null, 'RELOAD_CONFIG', 'Configuración del servidor recargada', ip)
  }

  return NextResponse.json({ success: soapResult.success, result: soapResult.result })
}
