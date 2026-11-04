import Link from 'next/link'
import { queryCms } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight } from 'lucide-react'

interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string
  image: string
  category: string
  author_name: string
  created_at: Date
}

async function getLatestNews(): Promise<NewsItem[]> {
  try {
    return await queryCms<NewsItem>(
      'SELECT id, slug, title, excerpt, image, category, author_name, created_at FROM cms_news WHERE published = 1 ORDER BY pinned DESC, created_at DESC LIMIT 3'
    )
  } catch {
    return []
  }
}

const categoryColors: Record<string, string> = {
  Eventos: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Actualizaciones: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  PvP: 'text-red-400 bg-red-500/10 border-red-500/20',
  PvE: 'text-green-400 bg-green-500/10 border-green-500/20',
  General: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  Mantenimiento: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

export async function NewsSection() {
  const news = await getLatestNews()

  return (
    <section className="relative z-10 py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-['Cinzel'] font-black text-4xl text-white mb-2">
              Últimas{' '}
              <span style={{
                background: 'linear-gradient(135deg, #75C7FF, #FFFFFF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Noticias
              </span>
            </h2>
            <p className="text-slate-400">Lo último del servidor</p>
          </div>
          <Link
            href="/news"
            className="hidden md:flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {news.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg">No hay noticias todavía. ¡Volvé pronto, aventurero!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((item) => (
              <Link key={item.id} href={`/news/${item.slug}`} className="group">
                <div className="bg-slate-900/60 border border-slate-700/50 group-hover:border-blue-500/40 rounded-2xl overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(117,199,255,0.1)] h-full flex flex-col">
                  {/* Imagen */}
                  <div className="relative h-48 overflow-hidden bg-slate-800">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10" />
                    <div
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url(${item.image || '/images/news/default.jpg'})` }}
                    />
                    <span className={`absolute top-3 left-3 z-20 text-xs px-2 py-1 rounded-full border font-medium ${categoryColors[item.category] || categoryColors.General}`}>
                      {item.category}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-['Cinzel'] font-semibold text-white group-hover:text-blue-200 transition-colors mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                      <span>{item.author_name || 'Staff'}</span>
                      <span>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-8 md:hidden">
          <Link href="/news" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
            Ver todas las noticias →
          </Link>
        </div>
      </div>
    </section>
  )
}
