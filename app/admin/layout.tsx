import { redirect } from 'next/navigation'
import { getSession, getFullGmLevel } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/admin')

  const gmlevel = await getFullGmLevel(session.id)
  if (gmlevel < 3) redirect('/')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #050A14 0%, #0a0f1e 50%, #050A14 100%)' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <AdminSidebar user={{ ...session, gmlevel }} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
