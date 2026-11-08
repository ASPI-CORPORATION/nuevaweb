import { Crown } from 'lucide-react'
import DirectivosSidebar from '@/components/directivos/DirectivosSidebar'
import { requirePageRole } from '@/lib/page-guard'
import { DIRECTIVO_RANK_LABEL } from '@/lib/roles'

export default async function DirectivosLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole('directivo', '/directivos')
  const membership = user.access.directivo
  const rankName = membership ? `${DIRECTIVO_RANK_LABEL[membership.rank]} · ${membership.name}` : null

  return (
    <div className="min-h-screen pt-16 bg-[radial-gradient(ellipse_at_top,rgba(246,180,14,0.07),transparent_60%)]">
      <div className="border-b border-[#F6B40E]/15 bg-[#F6B40E]/[0.03]">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-2 text-xs sm:text-sm">
          <Crown className="w-4 h-4 text-[#F6B40E] shrink-0" />
          <span className="font-['Cinzel'] font-bold text-[#F6B40E] tracking-wider">PANEL DE DIRECTIVOS</span>
          <span className="ml-auto text-[#c9a24a] truncate">Control administrativo completo</span>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-4 pb-10 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <DirectivosSidebar user={{ username: user.username, role: user.role, rankName }} />
          <main className="flex-1 min-w-0 pt-4 lg:pt-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
