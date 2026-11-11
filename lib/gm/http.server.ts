import { NextResponse } from 'next/server'
import { ActionError } from '@/lib/gm/actions.server'

export function actionErrorResponse(err: unknown, context: string) {
  if (err instanceof ActionError) return NextResponse.json({ error: err.message }, { status: err.status })
  console.error(`[gm:${context}]`, err instanceof Error ? err.message : err)
  return NextResponse.json({ error: 'No se pudo completar la operación. Intentá nuevamente.' }, { status: 500 })
}

export function parsePositiveInt(raw: string | null | undefined): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json() } catch { return null }
}
