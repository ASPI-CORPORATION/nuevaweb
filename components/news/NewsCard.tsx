import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pin, ArrowUpRight } from 'lucide-react'
import { NEWS_CATEGORY_STYLE } from '@/lib/content-config'
import { SolDeMayo } from '@/components/brand/SolDeMayo'

interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  category: string
  author_name: string | null
  created_at: Date
  pinned: number
}

export function NewsCard({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  const cat = NEWS_CATEGORY_STYLE[item.category] ?? NEWS_CATEGORY_STYLE.General
  const cover = item.image && item.image !== '/images/news/default.jpg' ? item.image : null

  return (
    <Link
      href={`/news/${item.slug}`}
      className="group card-dark h-full flex flex-col overflow-hidden hover:-translate-y-1 transition-transform duration-300 motion-reduce:transform-none"
    >
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#101F35] to-[#050A14] ${featured ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transform-none" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SolDeMayo className="w-20 h-20 opacity-25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050A14]/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] px-2 py-1 rounded-full border font-semibold backdrop-blur-sm" style={{ color: cat.color, borderColor: `${cat.color}55`, background: 'rgba(5,10,20,0.6)' }}>
            {cat.label}
          </span>
          {!!item.pinned && (
            <span className="text-[11px] px-2 py-1 rounded-full border text-[#F6B40E] border-[#F6B40E]/40 bg-[#050A14]/60 backdrop-blur-sm inline-flex items-center gap-1">
              <Pin className="w-3 h-3" /> Destacada
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <h3 className={`font-['Cinzel'] font-bold text-white group-hover:text-[#cfe6f8] transition-colors mb-2 line-clamp-2 break-words ${featured ? 'text-xl' : 'text-base sm:text-lg'}`}>
          {item.title}
        </h3>
        {item.excerpt && <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4">{item.excerpt}</p>}
        <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">{item.author_name || 'Staff'} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
          <ArrowUpRight className="w-4 h-4 text-[#74ACDF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </div>
    </Link>
  )
}
