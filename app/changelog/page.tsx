import { queryCms } from '@/lib/db'
import { ChangelogTimeline } from '@/components/changelog/ChangelogTimeline'
import { GitBranch } from 'lucide-react'

interface ChangelogEntry {
  id: number
  version: string
  title: string
  date: string
  changes: string
  type: string
  created_at: Date
}

async function getChangelog(): Promise<ChangelogEntry[]> {
  try {
    return await queryCms<ChangelogEntry>(
      'SELECT id, version, title, date, changes, type FROM cms_changelog ORDER BY date DESC LIMIT 50'
    )
  } catch {
    return []
  }
}

export default async function ChangelogPage() {
  const entries = await getChangelog()

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="font-['Cinzel'] font-black text-4xl text-white">Changelog</h1>
              <p className="text-slate-400 text-sm">Historial de cambios del servidor</p>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <p className="text-xl mb-2">No hay entradas de changelog</p>
          </div>
        ) : (
          <ChangelogTimeline entries={entries} />
        )}
      </div>
    </div>
  )
}
