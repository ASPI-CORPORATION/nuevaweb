'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pin } from 'lucide-react'

interface NewsItem {
  id: number
  slug: string
  title: string
  excerpt: string
  image: string
  category: string
  author_name: string
  created_at: Date
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

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link href={`/news/${item.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group bg-slate-900/60 border border-slate-700/50 hover:border-blue-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(117,199,255,0.1)] h-full flex flex-col"
      >
        {/* Imagen */}
        <div className="relative h-48 overflow-hidden bg-slate-800">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10" />
          <div
            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
            style={{ backgroundImage: `url(${item.image || '/images/news/default.jpg'})` }}
          />
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${categoryColors[item.category] || categoryColors.General}`}>
              {item.category}
            </span>
            {!!item.pinned && (
              <span className="text-xs px-2 py-1 rounded-full border text-yellow-400 bg-yellow-500/10 border-yellow-500/20">
                <Pin className="w-3 h-3 inline mr-1" />Fijada
              </span>
            )}
          </div>
        </div>

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
            <span className="font-medium">{item.author_name || 'Staff'}</span>
            <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
