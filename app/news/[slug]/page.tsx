import { notFound } from 'next/navigation'
import { queryCmsFirst, queryCms } from '@/lib/db'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Eye, Calendar, User } from 'lucide-react'
import Link from 'next/link'

interface NewsItem {
  id: number
  slug: string
  title: string
  content: string
  excerpt: string
  image: string
  category: string
  author_name: string
  created_at: Date
  views: number
  pinned: number
}

const categoryColors: Record<string, string> = {
  Eventos: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Actualizaciones: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  PvP: 'text-red-400 bg-red-500/10 border-red-500/20',
  PvE: 'text-green-400 bg-green-500/10 border-green-500/20',
  General: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  Mantenimiento: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

export default async function NewsSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let news: NewsItem | null = null
  try {
    news = await queryCmsFirst<NewsItem>(
      'SELECT * FROM cms_news WHERE slug = ? AND published = 1',
      [slug]
    )
    if (news) {
      await queryCms('UPDATE cms_news SET views = views + 1 WHERE id = ?', [news.id])
    }
  } catch {
    // DB no disponible
  }

  if (!news) notFound()

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link href="/news" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a Noticias
        </Link>

        {/* Hero image */}
        {news.image && (
          <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden mb-8 bg-slate-800">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${news.image})` }}
            />
          </div>
        )}

        {/* Category + meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${categoryColors[news.category] || categoryColors.General}`}>
            {news.category}
          </span>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(news.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {news.author_name || 'Staff'}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {news.views.toLocaleString('es-AR')} vistas
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-['Cinzel'] font-black text-3xl md:text-4xl text-white mb-6">
          {news.title}
        </h1>

        {/* Content */}
        <div
          className="prose prose-invert prose-blue max-w-none text-slate-300 leading-relaxed"
          style={{ lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: news.content }}
        />
      </div>
    </div>
  )
}
