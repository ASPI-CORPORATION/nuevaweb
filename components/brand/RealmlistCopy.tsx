'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { notify } from '@/components/ui/toaster'
import { REALMLIST_LINE } from '@/lib/site-config'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for http:// or browsers without the async clipboard API
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Shows `set realmlist …` with a COPIAR REALMLIST button. Text and toast are shared site-wide. */
export function RealmlistCopy({ variant = 'block', stacked, className = '' }: { variant?: 'block' | 'inline'; stacked?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (await copyText(REALMLIST_LINE)) {
      setCopied(true)
      notify.success('Realmlist copiado correctamente.')
      setTimeout(() => setCopied(false), 1800)
    } else {
      notify.error('No se pudo copiar', `Copialo a mano: ${REALMLIST_LINE}`)
    }
  }

  if (variant === 'inline') {
    return (
      <button type="button" onClick={copy}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[#74ACDF]/25 bg-[#74ACDF]/5 text-left hover:bg-[#74ACDF]/10 transition-colors ${className}`}
        aria-label="Copiar realmlist">
        <code className="text-xs sm:text-sm text-[#cfe6f8] break-all">{REALMLIST_LINE}</code>
        {copied ? <Check className="w-4 h-4 text-green-400 shrink-0" /> : <Copy className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
    )
  }

  return (
    <div className={`flex flex-col ${stacked ? '' : 'sm:flex-row'} gap-2 ${className}`}>
      <code className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-mono break-all border border-[#74ACDF]/20 bg-[#74ACDF]/[0.07] text-[#cfe6f8]">
        {REALMLIST_LINE}
      </code>
      <button type="button" onClick={copy}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-[#F6B40E]/35 text-[#F6B40E] bg-[#F6B40E]/[0.06] hover:bg-[#F6B40E]/[0.12] transition-colors shrink-0">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copiar realmlist
      </button>
    </div>
  )
}
