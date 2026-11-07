import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export function AccessDenied({ area }: { area: string }) {
  return (
    <div className="min-h-[70vh] pt-24 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md text-center rounded-2xl border border-red-500/25 bg-[#0A1628]/80 p-8">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <ShieldX className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="font-['Cinzel'] text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-sm text-slate-400 mb-6">
          Tu cuenta no tiene permisos para ingresar a <span className="text-slate-200">{area}</span>.
          El intento quedó registrado.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#74ACDF] text-[#050A14] font-semibold text-sm hover:bg-[#8fc0ea] transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
