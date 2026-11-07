import { CuentaSidebar } from '@/components/cuenta/CuentaSidebar'
import { requirePageRole } from '@/lib/page-guard'

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole('user', '/cuenta')

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 pb-10 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <CuentaSidebar username={user.username} role={user.role} />
          <main className="flex-1 min-w-0 pt-4 lg:pt-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
