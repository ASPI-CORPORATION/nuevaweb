import { Suspense } from 'react'
import { queryCms } from '@/lib/db'
import { NewsCard } from '@/components/news/NewsCard'
import { NewsFilters } from '@/components/news/NewsFilters'
import { NewsPagination } from '@/components/news/NewsPagination'

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

async function getNews(page: number, category: string, search: string): Promise<{ items: NewsItem[]; total: number }> {
  const pageSize = 9
  const offset = (page - 1) * pageSize
  const conditions = ['published = 1']
  const params: unknown[] = []

  if (category) {
    conditions.push('category = ?')
    params.push(category)
  }
  if (search) {
    conditions.push('(title LIKE ? OR excerpt LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const where = conditions.join(' AND ')

  const [countRow] = await queryCms<{ total: number }>(
    `SELECT COUNT(*) as total FROM cms_news WHERE ${where}`,
    params
  )

  const items = await queryCms<NewsItem>(
    `SELECT id, slug, title, excerpt, image, category, author_name, created_at, pinned
     FROM cms_news WHERE ${where}
     ORDER BY pinned DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return { items, total: countRow?.total ?? 0 }
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const category = params.category || ''
  const search = params.q || ''

  let news: { items: NewsItem[]; total: number } = { items: [], total: 0 }
  try {
    news = await getNews(page, category, search)
  } catch {
    // DB no disponible, mostrar vacío
  }

  const totalPages = Math.ceil(news.total / 9)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-3">
            Noticias
          </h1>
          <p className="text-slate-400">Todo lo que pasa en WoW Argentina</p>
        </div>

        {/* Filters */}
        <Suspense>
          <NewsFilters currentCategory={category} currentSearch={search} />
        </Suspense>

        {/* Grid */}
        <div className="mt-8">
          {news.items.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <p className="text-xl mb-2">No hay noticias que coincidan</p>
              <p className="text-sm">Probá con otro filtro o buscá algo diferente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.items.map(item => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <NewsPagination currentPage={page} totalPages={totalPages} />
        )}
      </div>
    </div>
  )
}
