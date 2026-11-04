import Link from 'next/link'
import { queryCms } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, Scroll, Rss } from 'lucide-react'

interface NewsItem {
  id: number; slug: string; title: string; excerpt: string
  image: string; category: string; author_name: string; created_at: Date
}

async function getLatestNews(): Promise<NewsItem[]> {
  try {
    return await queryCms<NewsItem>(
      'SELECT id, slug, title, excerpt, image, category, author_name, created_at FROM cms_news WHERE published = 1 ORDER BY pinned DESC, created_at DESC LIMIT 3'
    )
  } catch { return [] }
}

const CAT_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  Eventos:         { text: '#facc15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)' },
  Actualizaciones: { text: '#75C7FF', bg: 'rgba(117,199,255,0.08)', border: 'rgba(117,199,255,0.2)' },
  PvP:             { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  PvE:             { text: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  General:         { text: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  Mantenimiento:   { text: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)' },
}
const DEFAULT_CAT = CAT_STYLES.General

export async function NewsSection() {
  const news = await getLatestNews()

  return (
    <section className="relative z-10 py-20 md:py-28 px-4"
      style={{ background: 'linear-gradient(to bottom, transparent, rgba(8,15,30,0.5), transparent)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.18)', color: '#75C7FF' }}>
              <Rss className="w-3.5 h-3.5" /> Noticias del servidor
            </div>
            <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-2">
              Últimas{' '}
              <span style={{ background: 'linear-gradient(135deg, #75C7FF, #FFFFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Noticias
              </span>
            </h2>
            <p className="text-slate-400">Eventos, actualizaciones y novedades del servidor</p>
          </div>
          {news.length > 0 && (
            <Link href="/news" className="hidden md:flex items-center gap-2 text-sm font-medium transition-colors hover:gap-3"
              style={{ color: '#75C7FF' }}>
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {news.length === 0 ? (
          /* ── Premium empty state ─────────────────────────── */
          <div className="relative rounded-2xl p-10 md:p-16 text-center overflow-hidden"
            style={{ background: 'rgba(10,18,38,0.7)', border: '1px solid rgba(117,199,255,0.1)', backdropFilter: 'blur(14px)' }}>
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(117,199,255,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.14)' }}>
                <Scroll className="w-9 h-9" style={{ color: 'rgba(117,199,255,0.4)' }} />
              </div>
              <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-3">Los Escribas están preparando los Pergaminos</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                Todavía no hay noticias publicadas. Pronto encontrarás eventos, actualizaciones y novedades del servidor aquí.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href={process.env.NEXT_PUBLIC_DISCORD_URL || '#'} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Seguinos en Discord
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ── News cards ──────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {news.map((item) => {
              const cat = CAT_STYLES[item.category] ?? DEFAULT_CAT
              return (
                <Link key={item.id} href={`/news/${item.slug}`} className="group flex flex-col">
                  <div className="flex flex-col flex-1 rounded-2xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-4px]"
                    style={{
                      background: 'rgba(10,18,38,0.7)',
                      border: '1px solid rgba(117,199,255,0.08)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 0 0 0 rgba(117,199,255,0)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 32px rgba(117,199,255,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(117,199,255,0)' }}>

                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-slate-800/80 flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10" />
                      {item.image && (
                        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-107 transition-transform duration-500"
                          style={{ backgroundImage: `url(${item.image})` }} />
                      )}
                      {!item.image && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(117,199,255,0.07) 0%, transparent 70%)' }}>
                          <Scroll className="w-12 h-12" style={{ color: 'rgba(117,199,255,0.2)' }} />
                        </div>
                      )}
                      {/* Category badge */}
                      <span className="absolute top-3 left-3 z-20 text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: cat.bg, border: `1px solid ${cat.border}`, color: cat.text }}>
                        {item.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-['Cinzel'] font-semibold text-white mb-2 line-clamp-2 leading-snug group-hover:text-blue-200 transition-colors">
                        {item.title}
                      </h3>
                      {item.excerpt && (
                        <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">{item.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-3 border-t"
                        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <span>{item.author_name || 'Staff'}</span>
                        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {news.length > 0 && (
          <div className="text-center mt-8 md:hidden">
            <Link href="/news" className="text-sm font-medium transition-colors" style={{ color: '#75C7FF' }}>
              Ver todas las noticias →
            </Link>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(117,199,255,0.1), transparent)' }} />
    </section>
  )
}
