import Link from 'next/link'
import { ArrowRight, Scroll } from 'lucide-react'
import { queryCms } from '@/lib/db'
import { NewsCard } from '@/components/news/NewsCard'
import { DiscordIcon } from '@/components/brand/DiscordIcon'
import { DISCORD_URL } from '@/lib/site-config'

interface NewsItem {
  id: number; slug: string; title: string; excerpt: string | null
  image: string | null; category: string; author_name: string | null; created_at: Date; pinned: number
}

async function getLatestNews(): Promise<NewsItem[]> {
  try {
    return await queryCms<NewsItem>(
      `SELECT id, slug, title, excerpt, image, category, author_name, created_at, pinned
       FROM cms_news WHERE published = 1 ORDER BY pinned DESC, created_at DESC LIMIT 3`
    )
  } catch { return [] }
}

export async function NewsSection() {
  const news = await getLatestNews()

  return (
    <section className="relative z-10 py-16 md:py-24 px-4" aria-labelledby="home-news-title">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <span className="eyebrow">Noticias del servidor</span>
            <h2 id="home-news-title" className="font-['Cinzel'] font-black text-3xl md:text-5xl text-white mt-3 mb-2">
              Últimas <span className="gradient-text">Noticias</span>
            </h2>
            <p className="text-slate-400">Eventos, actualizaciones y novedades de Rasganorte</p>
          </div>
          {news.length > 0 && (
            <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-[#74ACDF] hover:gap-3 transition-all">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {news.length === 0 ? (
          <div className="card-dark p-8 md:p-14 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-[#74ACDF]/10 border border-[#74ACDF]/20">
              <Scroll className="w-8 h-8 text-[#74ACDF]/60" />
            </div>
            <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-2">Los escribas están preparando los pergaminos</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Todavía no hay noticias publicadas. Mientras tanto, enterate de todo en nuestro Discord.
            </p>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors">
              <DiscordIcon className="w-4 h-4" /> Seguinos en Discord
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {news.map((item, i) => (
              <div key={item.id} className={i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}>
                <NewsCard item={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
