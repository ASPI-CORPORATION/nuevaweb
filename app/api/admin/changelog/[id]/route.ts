import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { executeCms } from '@/lib/db'
import {
  getChangelogEntry, hasExtendedChangelog, changelogSchema, prepareChangelog, changelogProblem,
  needsExtendedColumns, MIGRATION_REQUIRED,
} from '@/lib/changelog.server'
import { dbErrorResponse, logContentAction } from '@/lib/news.server'
import { revalidateChangelogPages } from '@/lib/revalidate'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

function parseId(raw: string) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireRole(req, 'admin')
  if (result instanceof Response) return result
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const entry = await getChangelogEntry(id)
  if (!entry) return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
  return NextResponse.json({ entry })
}

/** Full update: the editor always sends the whole entry. `{ published }` alone toggles visibility. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireRole(req, 'admin')
  if (admin instanceof Response) return admin
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const current = await getChangelogEntry(id)
  if (!current) return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })

  // Merge so a visibility toggle does not need the whole payload
  const merged = {
    version: current.version, title: current.title, date: current.date, type: current.type,
    category: current.category, image: current.image ?? '', summary: current.summary ?? '',
    content: current.content ?? '', published: current.published, changes: current.changes,
    ...body,
  }
  const parsed = changelogSchema.safeParse(merged)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const d = prepareChangelog(parsed.data)
  const problem = changelogProblem(d)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  try {
    const extended = await hasExtendedChangelog()
    if (!extended && needsExtendedColumns(d)) return NextResponse.json({ error: MIGRATION_REQUIRED }, { status: 422 })

    if (extended) {
      await executeCms(
        `UPDATE cms_changelog SET version = ?, title = ?, image = ?, summary = ?, content = ?, date = ?, changes = ?,
                type = ?, category = ?, published = ?
         WHERE id = ?`,
        [d.version, d.title, d.image, d.summary, d.content, d.date, JSON.stringify(d.changes), d.type, d.category, d.published ? 1 : 0, id]
      )
    } else {
      await executeCms(
        'UPDATE cms_changelog SET version = ?, title = ?, date = ?, changes = ?, type = ? WHERE id = ?',
        [d.version, d.title, d.date, JSON.stringify(d.changes), d.type, id]
      )
    }
  } catch (err) {
    return dbErrorResponse(err, 'changelog:update')
  }

  const { normalizedIp } = normalizeIP(getClientIP(req.headers))
  const action = current.published === d.published ? 'CHANGELOG_UPDATE' : d.published ? 'CHANGELOG_PUBLISH' : 'CHANGELOG_UNPUBLISH'
  await logContentAction(admin.id, action, `${admin.username} modificó el changelog #${id} v${d.version}`, normalizedIp)
  revalidateChangelogPages()
  return NextResponse.json({ success: true, published: d.published })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireRole(req, 'admin')
  if (admin instanceof Response) return admin
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const current = await getChangelogEntry(id)
  if (!current) return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
  try {
    await executeCms('DELETE FROM cms_changelog WHERE id = ?', [id])
  } catch (err) {
    return dbErrorResponse(err, 'changelog:delete')
  }
  const { normalizedIp } = normalizeIP(getClientIP(req.headers))
  await logContentAction(admin.id, 'CHANGELOG_DELETE', `${admin.username} eliminó el changelog #${id} v${current.version}`, normalizedIp)
  revalidateChangelogPages()
  return NextResponse.json({ success: true })
}
