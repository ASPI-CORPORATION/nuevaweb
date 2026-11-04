import { queryCmsFirst } from '@/lib/db'

async function getMaintenanceMode() {
  try {
    const config = await queryCmsFirst<{ value: string }>(
      'SELECT value FROM cms_config WHERE key_name = ?',
      ['maintenance_mode']
    )
    return config?.value === '1'
  } catch {
    return false
  }
}

export async function MaintenanceBanner() {
  const isMaintenance = await getMaintenanceMode()
  if (!isMaintenance) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500/90 text-yellow-900 text-center py-2 text-sm font-semibold backdrop-blur-sm border-b border-yellow-400">
      ⚔️ Servidor en mantenimiento. Volvemos pronto, aventurero.
    </div>
  )
}
