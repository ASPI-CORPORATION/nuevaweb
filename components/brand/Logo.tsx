import Link from 'next/link'
import { SolDeMayo } from './SolDeMayo'

export function Logo({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="group flex items-center gap-2.5 shrink-0" aria-label="WoW Argentina — Inicio">
      <span className="relative flex items-center justify-center w-10 h-10">
        <SolDeMayo className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:rotate-45 motion-reduce:transition-none" />
        <span className="relative w-[18px] h-[22px] rounded-b-[9px] rounded-t-[3px] bg-gradient-to-b from-[#74ACDF] via-white to-[#74ACDF] border border-[#050A14]/40 shadow-sm" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-['Cinzel'] font-bold text-[13px] tracking-[0.2em] text-white group-hover:text-[#cfe6f8] transition-colors">
            WOW
          </span>
          <span className="block font-['Cinzel'] font-black text-[15px] tracking-[0.12em] bg-gradient-to-r from-[#74ACDF] via-white to-[#74ACDF] bg-clip-text text-transparent">
            ARGENTINA
          </span>
        </span>
      )}
    </Link>
  )
}
