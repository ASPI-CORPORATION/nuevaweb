import { getSession, getFullGmLevel } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GmSidebar } from '@/components/gm/GmSidebar'

export default async function GmLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const gmlevel = await getFullGmLevel(session.id)
  if (gmlevel < 2) redirect('/')

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-slate-950 to-green-950/5">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <GmSidebar username={session.username} gmlevel={gmlevel} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
