import { queryCharacters } from '@/lib/db'
import { getServerStatus } from '@/lib/gm/status.server'
import { SITE } from '@/lib/site-config'
import { RealmlistCopy } from '@/components/brand/RealmlistCopy'
import { Server, Wifi, Cpu, Globe, Users } from 'lucide-react'

async function getOnlineCount() {
  try {
    const rows = await queryCharacters<{ c: number }>('SELECT COUNT(*) as c FROM characters WHERE online = 1')
    return Number(rows[0]?.c ?? 0)
  } catch { return null }
}

export async function ServerStatusSection() {
  const [online, status] = await Promise.all([getOnlineCount(), getServerStatus().catch(() => null)])
  const isLive = online !== null

  // Real checks only: authserver TCP, worldserver SOAP, database query. Nothing is assumed online.
  const services = [
    { label: 'Auth Server', online: !!status?.authserver.online, desc: status?.authserver.online ? 'Autenticación activa' : 'Sin respuesta' },
    { label: 'World Server', online: !!status?.worldserver.online, desc: status?.worldserver.online ? 'Rasganorte disponible' : 'Fuera de línea' },
    { label: 'Base de Datos', online: isLive, desc: isLive ? 'Conexión correcta' : 'Sin conexión' },
    { label: 'Web CMS', online: true, desc: 'Portal funcionando' },
  ]
  const allOnline = services.every(s => s.online)

  const info = [
    { Icon: Cpu, label: 'Core', value: 'AzerothCore 2026' },
    { Icon: Globe, label: 'Versión', value: 'WotLK 3.3.5a' },
    { Icon: Server, label: 'Expansión', value: 'Wrath of the Lich King' },
    { Icon: Wifi, label: 'Realmlist', value: SITE.realmlist },
  ]

  return (
    <section className="relative z-10 py-20 md:py-28 px-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(5,15,40,0.8) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={allOnline
              ? { background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ade80' }
              : { background: 'rgba(246,180,14,0.07)', border: '1px solid rgba(246,180,14,0.2)', color: '#F6B40E' }}>
            <span className={`w-1.5 h-1.5 rounded-full ${allOnline ? 'bg-green-400 animate-pulse' : 'bg-[#F6B40E]'}`} />
            {allOnline ? 'Sistema operativo' : 'Estado del servidor'}
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
                  <div className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${s.online ? 'text-green-400' : 'text-red-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${s.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                    {s.online ? 'ONLINE' : 'OFFLINE'}
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
            {/* Realmlist oficial */}
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Realmlist oficial</div>
            <RealmlistCopy stacked />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(74,222,128,0.1), transparent)' }} />
    </section>
  )
}
