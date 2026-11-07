import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cache } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Eye, Calendar, User, Pin } from 'lucide-react'
import { queryCmsFirst, executeCms } from '@/lib/db'
import { sanitizeRichHtml, htmlToPlainText } from '@/lib/sanitize'
import { NEWS_CATEGORY_STYLE } from '@/lib/content-config'
import { SolDeMayo } from '@/components/brand/SolDeMayo'
import { DiscordIcon } from '@/components/brand/DiscordIcon'
import { DISCORD_URL } from '@/lib/site-config'

interface NewsItem {
  id: number
  slug: string
  title: string
  content: string
  excerpt: string | null
  image: string | null
  category: string
  author_name: string | null
  created_at: Date
  updated_at: Date
  views: number
  pinned: number
}

const getNews = cache(async (slug: string) => {
  try {
    return await queryCmsFirst<NewsItem>('SELECT * FROM cms_news WHERE slug = ? AND published = 1', [slug])
  } catch {
    return null
  }
})

const coverOf = (n: NewsItem) => (n.image && n.image !== '/images/news/default.jpg' ? n.image : null)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const news = await getNews((await params).slug)
  if (!news) return { title: 'Noticia no encontrada — WoW Argentina' }
  const cover = coverOf(news)
  return {
    title: `${news.title} — WoW Argentina`,
    description: news.excerpt ?? undefined,
    openGraph: { title: news.title, description: news.excerpt ?? undefined, type: 'article', images: cover ? [{ url: cover }] : undefined },
  }
}

export default async function NewsSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const news = await getNews(slug)
  if (!news) notFound()

  await executeCms('UPDATE cms_news SET views = views + 1 WHERE id = ?', [news.id]).catch(() => {})

  const cat = NEWS_CATEGORY_STYLE[news.category] ?? NEWS_CATEGORY_STYLE.General
  const cover = coverOf(news)
  const html = sanitizeRichHtml(news.content)
  // Auto-generated excerpts repeat the first paragraph; only show a hand-written summary
  const lead = news.excerpt?.replace(/…$/, '').trim() ?? ''
  const showExcerpt = lead.length > 0 && !htmlToPlainText(html).startsWith(lead)

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 px-4">
      <article className="max-w-3xl mx-auto">
        <Link href="/news" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Noticias
        </Link>

        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-6 sm:mb-8 border border-white/10 bg-gradient-to-br from-[#101F35] to-[#050A14]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="w-full h-full object-cover" fetchPriority="high" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <SolDeMayo className="w-28 h-28 opacity-30" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
          <span className="text-xs px-3 py-1 rounded-full border font-semibold" style={{ color: cat.color, borderColor: `${cat.color}40`, background: `${cat.color}14` }}>
            {cat.label}
          </span>
          {!!news.pinned && <span className="text-xs inline-flex items-center gap-1 text-[#F6B40E]"><Pin className="w-3.5 h-3.5" /> Destacada</span>}
          <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3.5 h-3.5" />{format(new Date(news.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
          <span className="flex items-center gap-1 text-xs text-slate-400"><User className="w-3.5 h-3.5" />{news.author_name || 'Staff'}</span>
          <span className="flex items-center gap-1 text-xs text-slate-400"><Eye className="w-3.5 h-3.5" />{(news.views + 1).toLocaleString('es-AR')} vistas</span>
        </div>

        <h1 className="font-['Cinzel'] font-black text-2xl sm:text-4xl text-white mb-4 leading-tight break-words">{news.title}</h1>
        {showExcerpt && <p className="text-base sm:text-lg text-slate-300 mb-8 border-l-2 border-[#F6B40E] pl-4">{news.excerpt}</p>}

        <div className="prose-ar" dangerouslySetInnerHTML={{ __html: html }} />

        <div className="mt-12 rounded-2xl border border-[#5865F2]/30 bg-[#5865F2]/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold text-white">¿Querés comentar esta noticia?</div>
            <div className="text-sm text-slate-400">Sumate a la comunidad en nuestro Discord oficial.</div>
          </div>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold">
            <DiscordIcon className="w-4 h-4" /> Unite al Discord
          </a>
        </div>
      </article>
    </div>
  )
}
