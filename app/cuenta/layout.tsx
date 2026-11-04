import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CuentaSidebar } from '@/components/cuenta/CuentaSidebar'

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/cuenta')

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <CuentaSidebar username={session.username} gmlevel={session.gmlevel} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
