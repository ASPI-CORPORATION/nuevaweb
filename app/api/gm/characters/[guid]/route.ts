import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGm, gmRateLimit } from '@/lib/gm/access.server'
import {
  banCharacter, unbanCharacter, kickCharacter, unstuckCharacter, teleportToCapital,
} from '@/lib/gm/actions.server'
import { actionErrorResponse, parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { SANCTION_DURATIONS } from '@/lib/gm/permissions'
import { CAPITALS } from '@/lib/gm/wow-data'

const durations = SANCTION_DURATIONS.map(d => d.key) as [string, ...string[]]
const capitals = CAPITALS.map(c => c.key) as [string, ...string[]]
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ban'), duration: z.enum(durations), reason: z.string().max(300) }),
  z.object({ action: z.literal('unban') }),
  z.object({ action: z.literal('kick'), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('unstuck'), location: z.enum(['inn', 'graveyard', 'startzone']).default('inn') }),
  z.object({ action: z.literal('teleport'), capital: z.enum(capitals).optional() }),
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const ctx = await requireGm(req, 'viewCharacters')
  if (ctx instanceof Response) return ctx
  const limited = gmRateLimit(ctx, 'characters', 60)
  if (limited) return limited

  const guid = parsePositiveInt((await params).guid)
  if (!guid) return NextResponse.json({ error: 'Personaje inválido.' }, { status: 400 })
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Datos de la acción inválidos.' }, { status: 400 })
  const b = parsed.data

  try {
    switch (b.action) {
      case 'ban': {
        const r = await banCharacter(ctx, guid, b.duration, b.reason)
        return NextResponse.json({ success: true, message: `El personaje ${r.character} ha sido baneado con éxito (${r.duration}).`, ...r })
      }
      case 'unban': {
        const r = await unbanCharacter(ctx, guid)
        return NextResponse.json({ success: true, message: `Se levantó correctamente la sanción del personaje ${r.character}.`, ...r })
      }
      case 'kick': {
        const r = await kickCharacter(ctx, guid, b.reason)
        return NextResponse.json({ success: true, message: `${r.character} fue expulsado del servidor.`, ...r })
      }
      case 'unstuck': {
        const r = await unstuckCharacter(ctx, guid, b.location)
        return NextResponse.json({ success: true, message: `${r.character} fue enviado a ${r.where}.`, ...r })
      }
      case 'teleport': {
        const r = await teleportToCapital(ctx, guid, b.capital)
        return NextResponse.json({ success: true, message: `El personaje ${r.character} fue enviado correctamente a ${r.capital}.`, ...r })
      }
    }
  } catch (err) {
    return actionErrorResponse(err, `characters:${b.action}`)
  }
}
