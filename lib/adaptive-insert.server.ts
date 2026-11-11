import { queryCms } from '@/lib/db'

interface ColumnInfo { Field: string; Type: string; Null: 'YES' | 'NO'; Default: string | null; Extra: string }

const cache = new Map<string, ColumnInfo[]>()

async function columnsOf(table: string): Promise<ColumnInfo[]> {
  if (!/^[a-z_]+$/.test(table)) throw new Error('invalid table')
  let cols = cache.get(table)
  if (!cols) {
    cols = await queryCms<ColumnInfo>(`SHOW COLUMNS FROM ${table}`)
    cache.set(table, cols)
  }
  return cols
}

function neutralValue(type: string): unknown {
  const t = type.toLowerCase()
  if (/int|decimal|float|double|bit|bool/.test(t)) return 0
  if (/datetime|timestamp/.test(t)) return new Date()
  if (t.startsWith('date')) return new Date().toISOString().slice(0, 10)
  if (t.startsWith('enum(')) return t.match(/^enum\('((?:[^']|'')*)'/)?.[1]?.replace(/''/g, "'") ?? ''
  return ''
}

/**
 * INSERT into a CMS table using only the columns that really exist there. Production
 * databases may differ from database/cms.sql (extra NOT NULL columns, or migrations not
 * applied yet): unknown keys are dropped and required columns without a default get a
 * neutral value, so auditing never breaks an operation that already happened.
 */
export async function adaptiveInsert(table: string, values: Record<string, unknown>) {
  const cols = await columnsOf(table)
  const names = new Set(cols.map(c => c.Field))
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) if (names.has(k) && v !== undefined) row[k] = v
  for (const c of cols) {
    const required = c.Null === 'NO' && c.Default === null && !/auto_increment|DEFAULT_GENERATED/i.test(c.Extra)
    if (required && !(c.Field in row)) row[c.Field] = neutralValue(c.Type)
  }
  const fields = Object.keys(row)
  return queryCms(
    `INSERT INTO ${table} (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    fields.map(f => row[f])
  )
}

export function hasColumnCached(table: string, column: string): boolean | null {
  const cols = cache.get(table)
  return cols ? cols.some(c => c.Field === column) : null
}
