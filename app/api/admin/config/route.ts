import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'

const schema = z.object({
  maintenance_mode: z.enum(['0', '1']).optional(),
  motd: z.string().max(500).optional(),
  discord_url: z.string().url().optional().or(z.literal('')),
  topg_url: z.string().url().optional().or(z.literal('')),
  wowservers_url: z.string().url().optional().or(z.literal('')),
  vote_cooldown_hours: z.string().regex(/^\d+$/).optional(),
  vote_coins_reward: z.string().regex(/^\d+$/).optional(),
})

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  const rows = await queryCms<{ key_name: string; value: string }>('SELECT key_name, value FROM cms_config')
  const config = Object.fromEntries(rows.map(r => [r.key_name, r.value]))
  return NextResponse.json({ config })
}

export async function PATCH(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const updates = Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  for (const [key, value] of updates) {
    await queryCms(
      'INSERT INTO cms_config (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
      [key, value, value]
    )
  }

  return NextResponse.json({ success: true })
}
