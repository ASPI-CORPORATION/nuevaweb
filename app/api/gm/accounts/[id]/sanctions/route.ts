import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGm, gmRateLimit } from '@/lib/gm/access.server'
import { banAccount, unbanAccount, muteAccount, unmuteAccount } from '@/lib/gm/actions.server'
import { actionErrorResponse, parsePositiveInt, readJson } from '@/lib/gm/http.server'
import { SANCTION_DURATIONS } from '@/lib/gm/permissions'

const durations = SANCTION_DURATIONS.map(d => d.key) as [string, ...string[]]
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ban'), duration: z.enum(durations), reason: z.string().max(300) }),
  z.object({ action: z.literal('unban'), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('mute'), duration: z.enum(durations), reason: z.string().max(300), characterGuid: z.number().int().positive().optional() }),
  z.object({ action: z.literal('unmute'), characterGuid: z.number().int().positive().optional() }),
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Lowest capability involved; each action re-checks its own capability and the hierarchy.
  const ctx = await requireGm(req, 'viewSanctions')
  if (ctx instanceof Response) return ctx
  const limited = gmRateLimit(ctx, 'sanctions', 40)
  if (limited) return limited

  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID de cuenta inválido.' }, { status: 400 })
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return NextResponse.json({ error: 'Datos de la sanción inválidos.' }, { status: 400 })
  const b = parsed.data

  try {
    switch (b.action) {
      case 'ban': {
        const r = await banAccount(ctx, id, b.duration, b.reason)
        return NextResponse.json({ success: true, message: `El usuario ${r.username} ha sido baneado con éxito.`, ...r })
      }
      case 'unban': {
        const r = await unbanAccount(ctx, id, b.reason)
        return NextResponse.json({ success: true, message: `Se levantó correctamente la sanción del usuario ${r.username}.`, ...r })
      }
      case 'mute': {
        const r = await muteAccount(ctx, id, b.duration, b.reason, b.characterGuid)
        return NextResponse.json({
          success: true, ...r,
          message: `El usuario ${r.username} fue silenciado por ${r.duration}${r.pending ? ' (se aplica al conectarse)' : ''}.`,
        })
      }
      case 'unmute': {
        const r = await unmuteAccount(ctx, id, b.characterGuid)
        return NextResponse.json({ success: true, message: `Se quitó el silencio del usuario ${r.username}.`, ...r })
      }
    }
  } catch (err) {
    return actionErrorResponse(err, `sanctions:${b.action}`)
  }
}
