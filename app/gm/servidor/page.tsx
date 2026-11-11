'use client'

import useSWR from 'swr'
import { RefreshCw, Loader2 } from 'lucide-react'
import { fetcher, fmtDate, PageHeader, ErrorBox, Skeletons } from '@/components/gm/ui'
import { ServerStatusCards } from '@/components/gm/ServerStatusCards'
import { OnlineArea } from '@/components/gm/Charts'

export default function ServidorPage() {
  const { data, error, isValidating, mutate } = useSWR('/api/gm/overview', fetcher, { refreshInterval: 20000 })
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Monitoreo" title="Estado del servidor"
        description="Authserver verificado por conexión TCP al puerto de autenticación; worldserver por respuesta real a .server info (SOAP)."
        actions={<button onClick={() => mutate()} className="btn-ghost">{isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Actualizar</button>} />
      <ErrorBox error={error} />
      {!data ? <Skeletons rows={3} h="h-28" /> : (
        <>
          <ServerStatusCards status={data.status} />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Jugadores conectados', data.cards.onlinePlayers ?? 'No disponible', data.cards.onlinePlayersSource ? `según ${data.cards.onlinePlayersSource}` : ''],
              ['Cuentas registradas', data.cards.accounts ?? '—', 'acore_auth.account'],
              ['Personajes', data.cards.characters ?? '—', 'acore_characters.characters'],
            ].map(([l, v, h]) => (
              <div key={l as string} className="panel-card p-4"><div className="text-xs uppercase tracking-wider text-slate-400">{l}</div><div className="font-['Cinzel'] font-black text-2xl text-white mt-1">{String(v)}</div><div className="text-[11px] text-slate-500">{h}</div></div>
            ))}
          </div>
          <OnlineArea data={data.charts.online} />
          <p className="text-xs text-slate-500">Última verificación: {fmtDate(data.status.checkedAt)} (se cachea 15 s para no saturar el worldserver).</p>
        </>
      )}
    </div>
  )
}
