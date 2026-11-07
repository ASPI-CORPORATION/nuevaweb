import AdminSidebar from '@/components/admin/AdminSidebar'
import { requirePageRole } from '@/lib/page-guard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole('admin', '/admin')

  return (
    <div className="min-h-screen pt-16 bg-[radial-gradient(ellipse_at_top,rgba(116,172,223,0.08),transparent_60%)]">
      <div className="max-w-screen-xl mx-auto px-4 pb-10 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <AdminSidebar user={{ username: user.username, role: user.role }} />
          <main className="flex-1 min-w-0 pt-4 lg:pt-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
