'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { useState } from 'react'

const CATEGORIES = ['', 'Eventos', 'Actualizaciones', 'PvP', 'PvE', 'General', 'Mantenimiento']
const CATEGORY_LABELS: Record<string, string> = {
  '': 'Todas',
  Eventos: 'Eventos',
  Actualizaciones: 'Updates',
  PvP: 'PvP',
  PvE: 'PvE',
  General: 'General',
  Mantenimiento: 'Mant.',
}

export function NewsFilters({ currentCategory, currentSearch }: { currentCategory: string; currentSearch: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState(currentSearch)

  const navigate = (category: string, q: string) => {
    const p = new URLSearchParams()
    if (category) p.set('category', category)
    if (q) p.set('q', q)
    p.set('page', '1')
    router.push(`/news?${p.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') navigate(currentCategory, search) }}
          placeholder="Buscar noticias..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-600/50 focus:border-blue-500/50 text-white placeholder-slate-500 outline-none transition-colors text-sm"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => navigate(cat, currentSearch)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentCategory === cat
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
    </div>
  )
}
