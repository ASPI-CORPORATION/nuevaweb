'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Gavel, ShieldAlert } from 'lucide-react'
import { fetcher, fmtDate, PageHeader, Pill, EmptyState, Skeletons, ErrorBox } from '@/components/gm/ui'
import { durationInfo, GM_TIER_SHORT, type GmTier } from '@/lib/gm/permissions'

interface Active { type: string; accountId: number; target: string; start: string; end: string | null; gm: string; reason: string }
interface PanelRow {
  id: number; type: string; account_id: number; account_name: string; character_name: string | null; gm_name: string; gm_tier: GmTier
  reason: string; duration_key: string; starts_at: string; ends_at: string | null; status: string; revoked_by_name: string | null; revoked_at: string | null
}
const TYPE: Record<string, string> = { ban_account: 'Ban de cuenta', ban_character: 'Ban de personaje', mute: 'Silencio' }

export default function SancionesPage() {
  const [tab, setTab] = useState<'activas' | 'panel'>('activas')
  const { data, error, isLoading } = useSWR('/api/gm/sanctions', fetcher, { refreshInterval: 30000 })
  const active: Active[] = data?.active ?? []
  const panel: PanelRow[] = data?.panel ?? []

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Moderación" title="Sanciones" description="Baneos vigentes según AzerothCore y el registro de sanciones aplicadas desde este panel." />
      <div className="flex gap-1.5" role="tablist">
        {([['activas', `Vigentes en el servidor (${active.length})`], ['panel', `Aplicadas desde el panel (${panel.length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium border ${tab === k ? 'bg-[#74ACDF] text-[#050A14] border-[#74ACDF]' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>{l}</button>
        ))}
      </div>
      <ErrorBox error={error} />
      <section className="panel-card overflow-hidden">
        {isLoading ? <Skeletons rows={4} /> : tab === 'activas' ? (
          active.length === 0 ? <EmptyState icon={ShieldAlert} title="No hay baneos vigentes" /> : (
            <ul className="divide-y divide-white/5">
              {active.map((s, i) => (
                <li key={i} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><Pill color="#f87171">{s.type}</Pill><Link href={`/gm/cuentas/${s.accountId}`} className="font-semibold text-white hover:underline">{s.target}</Link></div>
                    <p className="text-sm text-slate-300 mt-1 break-words">{s.reason}</p>
                    <p className="text-xs text-slate-500">Desde {fmtDate(s.start)} · {s.end ? `hasta ${fmtDate(s.end)}` : 'permanente'} · GM {s.gm}</p>
                  </div>
                  <Link href={`/gm/cuentas/${s.accountId}`} className="btn-ghost px-3 py-1.5 text-xs self-start sm:self-center">Ver cuenta</Link>
                </li>
              ))}
            </ul>
          )
        ) : panel.length === 0 ? <EmptyState icon={Gavel} title="Todavía no se aplicaron sanciones desde el panel" /> : (
          <ul className="divide-y divide-white/5">
            {panel.map(s => (
              <li key={s.id} className="p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill color={s.status === 'activa' ? '#f87171' : '#F6B40E'}>{s.status === 'activa' ? 'Aplicada' : 'Revocada'}</Pill>
                  <span className="text-sm font-semibold text-white">{TYPE[s.type] ?? s.type}</span>
                  <Link href={`/gm/cuentas/${s.account_id}`} className="text-sm text-[#74ACDF] hover:underline">{s.account_name}{s.character_name ? ` · ${s.character_name}` : ''}</Link>
                </div>
                <p className="text-sm text-slate-300 mt-1 break-words">{s.reason}</p>
                <p className="text-xs text-slate-500">
                  {fmtDate(s.starts_at)} · {durationInfo(s.duration_key)?.label ?? s.duration_key} · por {s.gm_name} ({GM_TIER_SHORT[s.gm_tier]})
                  {s.revoked_by_name ? ` · revocada por ${s.revoked_by_name} el ${fmtDate(s.revoked_at)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
