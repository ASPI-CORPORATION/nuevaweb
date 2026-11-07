import type { Metadata } from 'next'
import { GitBranch } from 'lucide-react'
import { listChangelog, type ChangelogEntry } from '@/lib/changelog.server'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { ChangelogCard } from '@/components/changelog/ChangelogCard'
import { DiscordIcon } from '@/components/brand/DiscordIcon'
import { DISCORD_URL } from '@/lib/site-config'

// Changelog edits also trigger on-demand revalidatePath; without this the page was frozen at build time
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Actualizaciones — WoW Argentina',
  description: 'Historial oficial de cambios, correcciones, balances y eventos del servidor WoW Argentina.',
}

async function getEntries(): Promise<ChangelogEntry[]> {
  try {
    return await listChangelog({ limit: 60 })
  } catch (err) {
    console.error('[changelog] load failed:', err instanceof Error ? err.message : err)
    return []
  }
}

export default async function ChangelogPage() {
  const entries = await getEntries()

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 sm:mb-12">
          <span className="eyebrow">Registro oficial</span>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#74ACDF]/10 border border-[#74ACDF]/25 flex items-center justify-center shrink-0">
              <GitBranch className="w-6 h-6 text-[#74ACDF]" />
            </div>
            <h1 className="font-['Cinzel'] font-black text-[1.6rem] leading-tight min-[380px]:text-3xl sm:text-5xl text-white break-words min-w-0">Actualizaciones</h1>
          </div>
          <p className="text-slate-400 mt-3 max-w-2xl">Cada cambio que llega a Rasganorte: contenido nuevo, correcciones, balances y eventos.</p>
        </header>

        {entries.length === 0 ? (
          <div className="card-dark text-center py-16 px-6">
            <p className="text-white font-semibold text-lg mb-1">Todavía no hay actualizaciones publicadas</p>
            <p className="text-slate-400 text-sm mb-6">Las novedades del servidor también se anuncian en Discord.</p>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5865F2] text-white text-sm font-semibold">
              <DiscordIcon className="w-4 h-4" /> Unite al Discord
            </a>
          </div>
        ) : (
          <ol className="relative space-y-6 sm:space-y-8 sm:pl-10">
            <span className="hidden sm:block absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[#F6B40E]/50 via-[#74ACDF]/30 to-transparent" aria-hidden="true" />
            {entries.map((entry, i) => (
              <li key={entry.id} className="relative">
                <span className="hidden sm:flex absolute -left-10 top-6 w-6 h-6 rounded-full bg-[#050A14] border-2 items-center justify-center" style={{ borderColor: i === 0 ? '#F6B40E' : '#74ACDF' }} aria-hidden="true">
                  <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? '#F6B40E' : '#74ACDF' }} />
                </span>
                <ChangelogCard entry={entry} featured={i === 0} contentHtml={entry.content ? sanitizeRichHtml(entry.content) : null} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
