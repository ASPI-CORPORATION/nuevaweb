'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function NewsPagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const router = useRouter()
  const params = useSearchParams()

  const goTo = (page: number) => {
    const p = new URLSearchParams(params.toString())
    p.set('page', String(page))
    router.push(`/news?${p.toString()}`)
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <button
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage <= 1}
        className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) => {
        const prev = pages[i - 1]
        return (
          <div key={p} className="flex items-center gap-2">
            {prev && p - prev > 1 && <span className="text-slate-500 text-sm">...</span>}
            <button
              onClick={() => goTo(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === currentPage
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          </div>
        )
      })}

      <button
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
