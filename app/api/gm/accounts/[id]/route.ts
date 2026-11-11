import { NextRequest, NextResponse } from 'next/server'
import { requireGm } from '@/lib/gm/access.server'
import { getAccountDetail } from '@/lib/gm/accounts.server'
import { actionErrorResponse, parsePositiveInt } from '@/lib/gm/http.server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireGm(req, 'viewAccounts')
  if (ctx instanceof Response) return ctx
  const id = parsePositiveInt((await params).id)
  if (!id) return NextResponse.json({ error: 'ID de cuenta inválido.' }, { status: 400 })
  try {
    const account = await getAccountDetail(id, ctx.tier)
    if (!account) return NextResponse.json({ error: 'No encontramos una cuenta con el ID indicado.' }, { status: 404 })
    return NextResponse.json({ account, viewer: { id: ctx.user.id, tier: ctx.tier } })
  } catch (err) {
    return actionErrorResponse(err, 'accounts:detail')
  }
}
