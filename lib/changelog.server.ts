import { z } from 'zod'
import { queryCms } from '@/lib/db'
import {
  CHANGELOG_CATEGORIES, LEGACY_CHANGE_TYPE_MAP, isSafeImageUrl, type ChangelogCategory,
} from '@/lib/content-config'
import { sanitizeRichHtml } from '@/lib/sanitize'

export const VERSION_TYPES = ['Mayor', 'Menor', 'Hotfix'] as const
const EXTENDED_COLUMNS = ['image', 'summary', 'content', 'category', 'published', 'author_name', 'updated_at'] as const

export interface ChangeItem { type: ChangelogCategory; text: string }

export interface ChangelogEntry {
  id: number
  version: string
  title: string
  date: string
  type: string
  category: ChangelogCategory
  image: string | null
  summary: string | null
  content: string | null
  published: boolean
  author_name: string | null
  changes: ChangeItem[]
}

let migratedColumns: Set<string> | null = null

/**
 * Columns present in cms_changelog — lets the code run before and after the migration.
 * Only the migrated state is cached, so running the migration takes effect immediately.
 */
export async function getChangelogColumns(): Promise<Set<string>> {
  if (migratedColumns) return migratedColumns
  const rows = await queryCms<{ Field: string }>('SHOW COLUMNS FROM cms_changelog')
  const cols = new Set(rows.map(r => r.Field))
  if (EXTENDED_COLUMNS.every(c => cols.has(c))) migratedColumns = cols
  return cols
}

export async function hasExtendedChangelog(): Promise<boolean> {
  const cols = await getChangelogColumns()
  return EXTENDED_COLUMNS.every(c => cols.has(c))
}

/** mysql2 returns MySQL JSON columns already parsed, MariaDB returns strings — accept both. */
export function parseChanges(raw: unknown): ChangeItem[] {
  let value = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { return [] }
  }
  if (!Array.isArray(value)) return []
  return value
    .filter((c): c is { type?: unknown; text?: unknown } => !!c && typeof c === 'object')
    .map(c => {
      const t = String(c.type ?? '')
      const type = (CHANGELOG_CATEGORIES as readonly string[]).includes(t)
        ? (t as ChangelogCategory)
        : LEGACY_CHANGE_TYPE_MAP[t.toUpperCase()] ?? 'Nuevo'
      return { type, text: String(c.text ?? '').trim() }
    })
    .filter(c => c.text.length > 0)
}

type Row = Record<string, unknown>

function toEntry(r: Row, extended: boolean): ChangelogEntry {
  const changes = parseChanges(r.changes)
  return {
    id: Number(r.id),
    version: String(r.version),
    title: String(r.title),
    date: String(r.date_str),
    type: String(r.type),
    category: extended && r.category ? (r.category as ChangelogCategory) : (changes[0]?.type ?? 'Nuevo'),
    image: extended ? ((r.image as string) || null) : null,
    summary: extended ? ((r.summary as string) || null) : null,
    content: extended ? ((r.content as string) || null) : null,
    published: extended ? !!r.published : true,
    author_name: extended ? ((r.author_name as string) || null) : null,
    changes,
  }
}

export async function listChangelog(opts: { includeDrafts?: boolean; limit?: number } = {}): Promise<ChangelogEntry[]> {
  const extended = await hasExtendedChangelog()
  const cols = ['id', 'version', 'title', "DATE_FORMAT(date, '%Y-%m-%d') AS date_str", 'type', 'changes', 'created_at']
  if (extended) cols.push(...EXTENDED_COLUMNS)
  const where = extended && !opts.includeDrafts ? 'WHERE published = 1' : ''
  const rows = await queryCms<Row>(
    `SELECT ${cols.join(', ')} FROM cms_changelog ${where} ORDER BY date DESC, id DESC LIMIT ?`,
    [opts.limit ?? 100]
  )
  return rows.map(r => toEntry(r, extended))
}

export async function getChangelogEntry(id: number): Promise<ChangelogEntry | null> {
  const extended = await hasExtendedChangelog()
  const cols = ['id', 'version', 'title', "DATE_FORMAT(date, '%Y-%m-%d') AS date_str", 'type', 'changes']
  if (extended) cols.push(...EXTENDED_COLUMNS)
  const rows = await queryCms<Row>(`SELECT ${cols.join(', ')} FROM cms_changelog WHERE id = ?`, [id])
  return rows[0] ? toEntry(rows[0], extended) : null
}

const changeSchema = z.object({
  type: z.string().transform((t, ctx) => {
    if ((CHANGELOG_CATEGORIES as readonly string[]).includes(t)) return t as ChangelogCategory
    const legacy = LEGACY_CHANGE_TYPE_MAP[t.toUpperCase()]
    if (legacy) return legacy
    ctx.addIssue({ code: 'custom', message: `Tipo de cambio inválido: ${t}` })
    return z.NEVER
  }),
  text: z.string().trim().max(500, 'Cada cambio admite hasta 500 caracteres'),
})

export const changelogSchema = z.object({
  version: z.string().trim().min(1, 'Indicá el número de versión').max(20, 'Versión demasiado larga'),
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)'),
  type: z.enum(VERSION_TYPES, { message: 'Tipo de versión inválido' }).default('Menor'),
  category: z.enum(CHANGELOG_CATEGORIES, { message: 'Categoría inválida' }).default('Nuevo'),
  image: z.string().trim().max(500).default('')
    .refine(v => v === '' || isSafeImageUrl(v), 'La imagen debe ser una subida del panel o una URL https'),
  summary: z.string().trim().max(500, 'El resumen admite hasta 500 caracteres').default(''),
  content: z.string().max(200_000).default(''),
  published: z.boolean().default(true),
  changes: z.array(changeSchema).max(100).default([]),
})

export type ChangelogInput = z.infer<typeof changelogSchema>

export function prepareChangelog(d: ChangelogInput) {
  const changes = d.changes.filter(c => c.text.length > 0)
  const content = sanitizeRichHtml(d.content)
  return { ...d, changes, content: content || null, image: d.image || null, summary: d.summary || null }
}

export function changelogProblem(d: ReturnType<typeof prepareChangelog>): string | null {
  if (d.changes.length === 0 && !d.content) return 'Agregá al menos un cambio o una descripción.'
  return null
}

/** True when the payload uses fields that need the migration. */
export function needsExtendedColumns(d: ReturnType<typeof prepareChangelog>): boolean {
  return !!(d.image || d.summary || d.content || !d.published)
}

export const MIGRATION_REQUIRED =
  'Para usar imágenes, resumen, descripción o borradores ejecutá migrations/2026_11_changelog_imagenes.sql en wowargentina_cms.'
