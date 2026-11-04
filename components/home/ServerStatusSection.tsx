import { queryCharacters } from '@/lib/db'
import { Server, Wifi, Cpu, Globe, Users } from 'lucide-react'

async function getOnlineCount() {
  try {
    const rows = await queryCharacters<{ c: number }>('SELECT COUNT(*) as c FROM characters WHERE online = 1')
    return Number(rows[0]?.c ?? 0)
  } catch { return null }
}

export async function ServerStatusSection() {
  const online = await getOnlineCount()
  const isLive = online !== null

  const services = [
    { label: 'Auth Server', status: 'online', desc: 'Autenticación activa' },
    { label: 'World Server', status: 'online', desc: 'Rasganorte disponible' },
    { label: 'Base de Datos', status: 'online', desc: 'MySQL 8 estable' },
    { label: 'Web CMS', status: 'online', desc: 'Portal funcionando' },
  ]

  const info = [
    { Icon: Cpu, label: 'Core', value: 'AzerothCore 2026' },
    { Icon: Globe, label: 'Versión', value: 'WotLK 3.3.5a' },
    { Icon: Server, label: 'Expansión', value: 'Wrath of the Lich King' },
    { Icon: Wifi, label: 'Realmlist', value: process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar' },
  ]

  return (
    <section className="relative z-10 py-20 md:py-28 px-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(5,15,40,0.8) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ade80' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {isLive ? 'Sistema operativo' : 'Estado del servidor'}
          </div>
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Estado del{' '}
            <span style={{ background: 'linear-gradient(135deg, #4ade80, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Servidor
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Monitoreo en tiempo real de los servicios de WoW Argentina.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Services panel */}
          <div className="lg:col-span-1 rounded-2xl p-5"
            style={{ background: 'rgba(5,15,38,0.8)', border: '1px solid rgba(74,222,128,0.12)', backdropFilter: 'blur(14px)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-green-400" />
              <span className="font-['Cinzel'] text-sm font-semibold text-white">Servicios</span>
            </div>
            <div className="space-y-3">
              {services.map(s => (
                <div key={s.label} className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div>
                    <div className="text-sm font-medium text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-400 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    ONLINE
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live players counter */}
          <div className="lg:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center"
            style={{
              background: 'linear-gradient(160deg, rgba(117,199,255,0.08) 0%, rgba(5,15,38,0.9) 100%)',
              border: '1px solid rgba(117,199,255,0.18)',
              backdropFilter: 'blur(14px)',
            }}>
            <Users className="w-10 h-10 mb-4" style={{ color: 'rgba(117,199,255,0.5)' }} />
            <div className="font-['Cinzel'] font-black mb-2"
              style={{ fontSize: 'clamp(3rem,8vw,5rem)', color: '#75C7FF', filter: 'drop-shadow(0 0 24px rgba(117,199,255,0.5))' }}>
              {isLive ? online!.toLocaleString('es-AR') : '—'}
            </div>
            <div className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(117,199,255,0.5)' }}>
              Aventureros Online
            </div>
            <div className="flex items-center gap-2 text-xs"
              style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: '9999px', padding: '4px 12px', color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Dato en tiempo real
            </div>
          </div>

          {/* Tech info */}
          <div className="lg:col-span-1 rounded-2xl p-5"
            style={{ background: 'rgba(5,15,38,0.8)', border: '1px solid rgba(117,199,255,0.1)', backdropFilter: 'blur(14px)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="font-['Cinzel'] text-sm font-semibold text-white">Información Técnica</span>
            </div>
            <div className="space-y-3 mb-4">
              {info.map(item => (
                <div key={item.label} className="flex items-start gap-3 py-2 border-b last:border-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <item.Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</div>
                    <div className="text-sm font-medium text-slate-300 font-mono break-all">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Realmlist copy hint */}
            <div className="rounded-lg px-3 py-2 text-xs font-mono"
              style={{ background: 'rgba(117,199,255,0.06)', border: '1px solid rgba(117,199,255,0.1)', color: '#75C7FF' }}>
              set realmlist {process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar'}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(74,222,128,0.1), transparent)' }} />
    </section>
  )
}
