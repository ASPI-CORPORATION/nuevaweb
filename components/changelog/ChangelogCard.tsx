import { Calendar, Sparkles, Wrench, Scale, PartyPopper, ChevronDown } from 'lucide-react'
import { CHANGELOG_CATEGORY_STYLE, type ChangelogCategory } from '@/lib/content-config'
import { SolDeMayo } from '@/components/brand/SolDeMayo'

export interface ChangelogCardData {
  version: string
  title: string
  date: string
  type: string
  category: ChangelogCategory
  image: string | null
  summary: string | null
  changes: Array<{ type: ChangelogCategory; text: string }>
  published?: boolean
}

const ICON = { Nuevo: Sparkles, 'Corrección': Wrench, Balance: Scale, Evento: PartyPopper } as const

const VERSION_TYPE_STYLE: Record<string, string> = {
  Mayor: 'text-[#050A14] bg-[#F6B40E]',
  Menor: 'text-[#050A14] bg-[#74ACDF]',
  Hotfix: 'text-white bg-orange-600',
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  // Built from parts: a DATE must never shift a day because of the server/browser timezone
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ChangelogCard({ entry, contentHtml, featured = false }: { entry: ChangelogCardData; contentHtml?: string | null; featured?: boolean }) {
  const cat = CHANGELOG_CATEGORY_STYLE[entry.category] ?? CHANGELOG_CATEGORY_STYLE.Nuevo
  const CatIcon = ICON[entry.category] ?? Sparkles

  return (
    <article className={`card-dark overflow-hidden ${featured ? 'ring-1 ring-[#F6B40E]/30' : ''}`}>
      <div className={`relative overflow-hidden ${entry.image ? 'aspect-[16/9] sm:aspect-[21/9]' : 'h-24 sm:h-28'} bg-gradient-to-br from-[#101F35] via-[#0D1E35] to-[#050A14]`}>
        {entry.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <SolDeMayo className="absolute -right-6 -top-10 w-44 h-44 opacity-[0.12]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050A14]/90 via-[#050A14]/20 to-transparent" />
        <div className="absolute left-4 bottom-3 right-4 flex flex-wrap items-end gap-2">
          <span className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white drop-shadow">v{entry.version}</span>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${VERSION_TYPE_STYLE[entry.type] ?? VERSION_TYPE_STYLE.Menor}`}>
            {entry.type}
          </span>
          {entry.published === false && (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-200">Borrador</span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold" style={{ color: cat.color, borderColor: `${cat.color}45`, background: `${cat.color}12` }}>
            <CatIcon className="w-3.5 h-3.5" /> {cat.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5" /> {formatDate(entry.date)}
          </span>
        </div>

        <h3 className={`font-['Cinzel'] font-bold text-white break-words ${featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`}>{entry.title}</h3>
        {entry.summary && <p className="mt-2 text-sm sm:text-base text-slate-300">{entry.summary}</p>}

        {entry.changes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {entry.changes.map((c, i) => {
              const s = CHANGELOG_CATEGORY_STYLE[c.type] ?? CHANGELOG_CATEGORY_STYLE.Nuevo
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="shrink-0 mt-0.5 w-[92px] text-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-1 rounded border" style={{ color: s.color, borderColor: `${s.color}40`, background: `${s.color}10` }}>
                    {s.label}
                  </span>
                  <span className="text-slate-300 leading-relaxed min-w-0 break-words">{c.text}</span>
                </li>
              )
            })}
          </ul>
        )}

        {contentHtml && (
          <details className="group mt-5 rounded-xl border border-white/10 bg-white/[0.02]" open={featured}>
            <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none text-sm font-semibold text-[#74ACDF] [&::-webkit-details-marker]:hidden">
              Notas completas de la actualización
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 prose-ar" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </details>
        )}
      </div>
    </article>
  )
}
