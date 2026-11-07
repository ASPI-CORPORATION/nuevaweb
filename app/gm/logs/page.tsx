import { requirePageRole } from '@/lib/page-guard'
import { queryCms } from '@/lib/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText } from 'lucide-react'

export default async function GmLogsPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await requirePageRole('gm', '/gm/logs')

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const actionFilter = params.action || ''
  const offset = (page - 1) * 50

  let logs: Array<{ id: number; gm_account_id: number; action: string; details: string; created_at: Date; gm_name?: string }> = []

  try {
    logs = await queryCms(
      `SELECT l.id, l.gm_account_id, l.action, l.details, l.created_at,
              a.username as gm_name
       FROM cms_gm_logs l
       LEFT JOIN acore_auth.account a ON l.gm_account_id = a.id
       ${actionFilter ? 'WHERE l.action LIKE ?' : ''}
       ORDER BY l.created_at DESC LIMIT 50 OFFSET ?`,
      actionFilter ? [`%${actionFilter}%`, offset] : [offset]
    )
  } catch {}

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Logs GM</h1>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-400" />
          <h2 className="font-semibold text-white">Historial de Acciones</h2>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No hay logs disponibles</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-white">{log.gm_name || `GM#${log.gm_account_id}`}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15">
                        {log.action}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs">{log.details}</div>
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {format(new Date(log.created_at), 'd MMM HH:mm', { locale: es })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
