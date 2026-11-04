import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'

const schema = z.object({
  version: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['patch', 'update', 'hotfix', 'event']),
  changes: z.array(z.object({
    type: z.enum(['NUEVO', 'FIX', 'BALANCE', 'EVENTO']),
    text: z.string().min(1),
  })).min(1),
})

export async function GET(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  const entries = await queryCms('SELECT id, version, title, date, type, changes, created_at FROM cms_changelog ORDER BY date DESC LIMIT 100')
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const result = await requireGmLevel(req, 3)
  if (result instanceof Response) return result

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  await queryCms(
    'INSERT INTO cms_changelog (version, title, date, type, changes) VALUES (?, ?, ?, ?, ?)',
    [d.version, d.title, d.date, d.type, JSON.stringify(d.changes)]
  )

  return NextResponse.json({ success: true })
}
