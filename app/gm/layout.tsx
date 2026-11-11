import { GmSidebar } from '@/components/gm/GmSidebar'
import { requirePageRole } from '@/lib/page-guard'
import { tierOfAccess } from '@/lib/gm/access.server'
import { GM_TIER_LABEL } from '@/lib/gm/permissions'
import { Shield, ShieldOff } from 'lucide-react'
import { activeInternalSuspension } from '@/lib/staff/suspension.server'

export default async function GmLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole('gm', '/gm')
  const tier = tierOfAccess(user.access)
  const suspension = await activeInternalSuspension(user.id)

  return (
    <div className="min-h-screen pt-16 bg-[radial-gradient(ellipse_at_top,rgba(116,172,223,0.10),transparent_60%)]">
      <div className="border-b border-[#74ACDF]/15 bg-[#74ACDF]/[0.03]">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-2 text-xs sm:text-sm">
          <Shield className="w-4 h-4 text-[#74ACDF] shrink-0" />
          <span className="font-['Cinzel'] font-bold text-[#cfe6f8] tracking-wider">PANEL GAME MASTER</span>
          <span className="ml-auto text-[#74ACDF] truncate">{GM_TIER_LABEL[tier]}</span>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-4 pb-10 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <GmSidebar username={user.username} role={user.role} tier={tier} />
          <main className="flex-1 min-w-0 pt-4 lg:pt-0">
            {suspension ? (
              <div className="panel-card p-6 sm:p-8 border-red-500/30 text-center" role="alert">
                <ShieldOff className="w-10 h-10 text-red-400 mx-auto" />
                <h1 className="font-['Cinzel'] font-black text-2xl text-white mt-3">Funciones suspendidas</h1>
                <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
                  Un Directivo suspendió tus funciones de staff hasta el{' '}
                  {new Date(suspension.ends_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.
                  Mientras tanto no podés usar las herramientas del Panel GM.
                </p>
                <p className="text-xs text-slate-500 mt-3 break-words">Motivo: {suspension.reason}</p>
              </div>
            ) : children}
          </main>
        </div>
      </div>
    </div>
  )
}
