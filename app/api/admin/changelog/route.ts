import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { executeCms } from '@/lib/db'
import {
  listChangelog, hasExtendedChangelog, changelogSchema, prepareChangelog, changelogProblem,
  needsExtendedColumns, MIGRATION_REQUIRED,
} from '@/lib/changelog.server'
import { dbErrorResponse, logContentAction } from '@/lib/news.server'
import { revalidateChangelogPages } from '@/lib/revalidate'
import { getClientIP, normalizeIP } from '@/lib/ip-utils'

export async function GET(req: NextRequest) {
  const result = await requireRole(req, 'admin')
  if (result instanceof Response) return result
  try {
    const [entries, extended] = await Promise.all([listChangelog({ includeDrafts: true, limit: 200 }), hasExtendedChangelog()])
    return NextResponse.json({ entries, extended })
  } catch (err) {
    return dbErrorResponse(err, 'changelog:list')
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireRole(req, 'admin')
  if (admin instanceof Response) return admin

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const parsed = changelogSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = prepareChangelog(parsed.data)
  const problem = changelogProblem(d)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  try {
    const extended = await hasExtendedChangelog()
    if (!extended && needsExtendedColumns(d)) return NextResponse.json({ error: MIGRATION_REQUIRED }, { status: 422 })

    const res = extended
      ? await executeCms(
          `INSERT INTO cms_changelog (version, title, image, summary, content, date, changes, type, category, published, author_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [d.version, d.title, d.image, d.summary, d.content, d.date, JSON.stringify(d.changes), d.type, d.category, d.published ? 1 : 0, admin.username]
        )
      : await executeCms(
          'INSERT INTO cms_changelog (version, title, date, changes, type) VALUES (?, ?, ?, ?, ?)',
          [d.version, d.title, d.date, JSON.stringify(d.changes), d.type]
        )

    const { normalizedIp } = normalizeIP(getClientIP(req.headers))
    await logContentAction(admin.id, d.published ? 'CHANGELOG_PUBLISH' : 'CHANGELOG_DRAFT', `${admin.username} creó el changelog #${res.insertId} v${d.version}`, normalizedIp)
    revalidateChangelogPages()
    return NextResponse.json({ success: true, id: res.insertId })
  } catch (err) {
    return dbErrorResponse(err, 'changelog:create')
  }
}
