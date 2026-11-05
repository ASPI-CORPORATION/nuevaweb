'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search, Crown, Shield, ChevronRight, Users, Info, Loader2,
  RefreshCw, UserCheck, UserX, AlertTriangle,
} from 'lucide-react'
import { getRank, CUSTOM_RBAC_RANKS } from '@/lib/rbac'
import { RankAssignModal, type StaffMember } from '@/components/directivos/RankAssignModal'

// ── Design tokens ────────────────────────────────────────────────────────────
const GOLD    = '#F6B40E'
const CELESTE = '#74ACDF'
const DARK    = '#101F35'

// ── GM level labels ──────────────────────────────────────────────────────────
const GM_LABELS: Record<number, { label: string; color: string }> = {
  0:  { label: 'Jugador',    color: '#4a5568' },
  1:  { label: 'Trial GM',  color: '#60a5fa' },
  2:  { label: 'GM',        color: '#4ade80' },
  3:  { label: 'Admin',     color: '#c084fc' },
  10: { label: 'Directivo', color: GOLD },
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ── Rank badge component ──────────────────────────────────────────────────────
function RankBadge({ rankId }: { rankId: number | null }) {
  if (rankId === null) return <span className="text-xs" style={{ color: '#3a4a60' }}>Sin rango</span>
  const r = getRank(rankId)
  if (!r) return <span className="text-xs font-mono" style={{ color: '#4a5568' }}>{rankId}</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2 py-0.5"
      style={{ background: r.badgeBg, border: `1px solid ${r.badgeBorder}`, color: r.color }}>
      <Shield className="w-3 h-3" /> {r.name}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DirectivosStaffPage() {
  // Staff list (auto-refresh 30s)
  const { data: staffData, mutate: mutateStaff, isLoading: staffLoading } = useSWR(
    '/api/directivos/staff', fetcher, { refreshInterval: 30_000 }
  )
  const staff: StaffMember[] = staffData?.staff ?? []

  // History
  const { data: histData, mutate: mutateHist } = useSWR(
    '/api/directivos/staff/rbac?history=1&limit=20', fetcher
  )
  const history = histData?.logs ?? []

  // Search for any account to add
  const [searchQ, setSearchQ]   = useState('')
  const [searchResults, setSearchResults] = useState<StaffMember[]>([])
  const [searching, setSearching] = useState(false)

  // Filter staff table
  const [filterQ, setFilterQ]   = useState('')

  // Modal
  const [modalMember, setModalMember] = useState<StaffMember | null>(null)
  // callerRankId — in a real deployment fetch from server; here we infer from staff list
  // (The API itself enforces hierarchy — this is for UI display only)
  const callerRankId: number | null = null // treated as bootstrap Owner in API

  const [activeTab, setActiveTab] = useState<'staff' | 'history'>('staff')
  const [msg, setMsg] = useState('')

  const refresh = useCallback(() => {
    mutateStaff(); mutateHist()
  }, [mutateStaff, mutateHist])

  const handleSearch = async () => {
    if (!searchQ.trim()) return
    setSearching(true); setSearchResults([])
    const res = await fetch(`/api/directivos/staff/rbac?search=${encodeURIComponent(searchQ)}`)
    const data = await res.json()
    setSearchResults(data.accounts ?? [])
    setSearching(false)
  }

  const filteredStaff = staff.filter(s =>
    s.username.toLowerCase().includes(filterQ.toLowerCase()) ||
    String(s.id).includes(filterQ)
  )

  const onModalSuccess = () => {
    setMsg('Rango actualizado correctamente')
    refresh()
    setTimeout(() => setMsg(''), 4000)
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-['Cinzel'] font-black text-3xl mb-1" style={{ color: GOLD }}>
          Gestión de Staff y Rangos
        </h1>
        <p className="text-sm" style={{ color: `${GOLD}60` }}>
          Asignación de rangos RBAC personalizados · Toda acción queda en auditoría permanente
        </p>
      </div>

      {/* ── Cache warning ────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs"
        style={{ background: 'rgba(116,172,223,0.07)', border: `1px solid ${CELESTE}25`, color: CELESTE }}>
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Caché de RBAC:</strong> AzerothCore carga los permisos al iniciar sesión.
          Los cambios se guardan en <code style={{ color: GOLD }}>rbac_account_permissions</code> inmediatamente
          pero se aplican la próxima vez que la cuenta ingresa al juego.
          No hay recarga en caliente de sesiones activas.
        </span>
      </div>

      {/* ── Success msg ─────────────────────────────────────────────── */}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
          <UserCheck className="w-4 h-4" /> {msg}
        </div>
      )}

      {/* ── Rank legend ─────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={{ background: `${DARK}`, border: `1px solid ${GOLD}15` }}>
        <div className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: `${GOLD}80` }}>
          <Crown className="w-3.5 h-3.5" /> Jerarquía de rangos RBAC (ascendente)
        </div>
        <div className="flex flex-wrap gap-2">
          {[90000, 90001, 90002, 90003, 90004, 90005, 90006, 90007, 90008, 90009].map(id => {
            const r = CUSTOM_RBAC_RANKS[id as keyof typeof CUSTOM_RBAC_RANKS]
            return (
              <span key={id} className="inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1"
                style={{ background: r.badgeBg, border: `1px solid ${r.badgeBorder}`, color: r.color }}>
                <Shield className="w-3 h-3" /> {r.name}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Search any account ───────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: DARK, border: `1px solid ${GOLD}15` }}>
        <div className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: `${GOLD}80` }}>
          <Search className="w-3.5 h-3.5" /> Buscar cuenta para asignar rango
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Nombre de usuario o ID de cuenta..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GOLD}20` }}
            />
          </div>
          <button onClick={handleSearch} disabled={searching}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50 flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #B8860B)` }}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map(acc => (
              <div key={acc.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${GOLD}10` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: `${GOLD}15`, color: GOLD }}>
                    {acc.id}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{acc.username}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-2">
                      <RankBadge rankId={acc.rbac_rank_id} />
                      <span style={{ color: `${CELESTE}70` }}>GM {acc.gmlevel}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1 text-xs"
                    style={{ color: acc.online ? '#4ade80' : '#4a5568' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${acc.online ? 'bg-green-400' : 'bg-slate-600'}`} />
                    {acc.online ? 'Online' : 'Offline'}
                  </span>
                  <button onClick={() => setModalMember(acc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, #B8860B)` }}>
                    <Crown className="w-3 h-3" /> Gestionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {searchResults.length === 0 && searchQ && !searching && (
          <div className="mt-3 text-xs text-center py-3" style={{ color: '#4a5568' }}>Sin resultados</div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
        {(['staff', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-lg text-sm font-semibold font-['Cinzel'] transition-all"
            style={activeTab === tab ? { background: `linear-gradient(135deg, ${GOLD}, #B8860B)`, color: '#000' } : { color: `${GOLD}60` }}>
            {tab === 'staff' ? `Staff (${staff.length})` : 'Historial de cambios'}
          </button>
        ))}
      </div>

      {/* ── Staff table ──────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={filterQ} onChange={e => setFilterQ(e.target.value)}
                placeholder="Filtrar por usuario o ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GOLD}20` }} />
            </div>
            <button onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
              style={{ border: `1px solid ${GOLD}20`, color: `${GOLD}70` }}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: DARK, border: `1px solid ${GOLD}15` }}>
            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_200px_120px_100px_120px] gap-0 text-xs font-semibold tracking-wider"
              style={{ background: `${GOLD}08`, borderBottom: `1px solid ${GOLD}15`, padding: '10px 16px', color: `${GOLD}70` }}>
              <span>ID</span>
              <span>Usuario</span>
              <span>Rango RBAC</span>
              <span>Nivel GM</span>
              <span>Estado</span>
              <span className="text-right">Acciones</span>
            </div>

            {staffLoading && (
              <div className="flex items-center justify-center py-12 gap-2 text-sm" style={{ color: `${GOLD}50` }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
              </div>
            )}

            {!staffLoading && filteredStaff.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: '#3a4a60' }}>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {filterQ ? 'Sin resultados para ese filtro' : 'No hay staff registrado'}
              </div>
            )}

            {filteredStaff.map((member, idx) => {
              const rank = member.rbac_rank_id !== null ? getRank(member.rbac_rank_id) : null
              const gmInfo = GM_LABELS[member.gmlevel] ?? { label: `GM${member.gmlevel}`, color: CELESTE }
              return (
                <div key={member.id}
                  className="grid grid-cols-[48px_1fr_200px_120px_100px_120px] gap-0 items-center transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: idx < filteredStaff.length - 1 ? `1px solid ${GOLD}08` : 'none', padding: '12px 16px' }}>

                  {/* ID */}
                  <span className="text-xs font-mono" style={{ color: `${CELESTE}60` }}>{member.id}</span>

                  {/* Username */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: rank ? rank.badgeBg : 'rgba(255,255,255,0.05)', color: rank ? rank.color : '#4a5568' }}>
                      {member.username[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-white text-sm truncate">{member.username}</span>
                  </div>

                  {/* RBAC rank */}
                  <RankBadge rankId={member.rbac_rank_id} />

                  {/* GM level */}
                  <span className="text-xs font-semibold" style={{ color: gmInfo.color }}>
                    {gmInfo.label}
                  </span>

                  {/* Online status */}
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${member.online ? 'bg-green-400' : 'bg-slate-700'}`} />
                    <span className="text-xs" style={{ color: member.online ? '#4ade80' : '#4a5568' }}>
                      {member.online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <button onClick={() => setModalMember(member)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${GOLD}, #B8860B)` }}>
                      <Crown className="w-3 h-3" /> Gestionar <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend: GM vs RBAC difference */}
          <div className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2 text-xs"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#4a5568' }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: `${GOLD}50` }} />
            <span>
              <strong style={{ color: `${GOLD}80` }}>Nivel GM</strong> es el permiso interno de AzerothCore (account_access).
              El <strong style={{ color: `${CELESTE}80` }}>Rango RBAC</strong> es el rango organizacional personalizado
              de WoW Argentina (rbac_account_permissions). Son independientes — un cambio en uno no afecta al otro.
            </span>
          </div>
        </div>
      )}

      {/* ── History ──────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div className="rounded-2xl overflow-hidden" style={{ background: DARK, border: `1px solid ${GOLD}15` }}>
            <div className="px-5 py-3 text-xs font-semibold tracking-wider flex items-center justify-between"
              style={{ background: `${GOLD}08`, borderBottom: `1px solid ${GOLD}15`, color: `${GOLD}70` }}>
              <span>Historial de cambios RBAC</span>
              <button onClick={refresh} className="transition-opacity hover:opacity-80">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{ color: '#3a4a60' }}>
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Sin cambios RBAC registrados
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: `${GOLD}08` }}>
                {history.map((log: {
                  id: number; action: string; details: string; created_at: string
                  directivo_name: string | null; target_name: string | null; ip: string
                }) => {
                  const isAssign = log.action === 'ASSIGN_RBAC_RANK'
                  const isRemove = log.action === 'REMOVE_RBAC_RANK'
                  return (
                    <div key={log.id} className="px-5 py-3.5 hover:bg-white/[0.015]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {/* Admin who acted */}
                            <span className="text-xs font-semibold text-white">
                              {log.directivo_name ?? 'Sistema'}
                            </span>
                            {/* Action badge */}
                            <span className="text-xs px-2 py-0.5 rounded-lg font-mono font-semibold"
                              style={{
                                background: isAssign ? 'rgba(74,222,128,0.1)' : isRemove ? 'rgba(239,68,68,0.1)' : `${GOLD}10`,
                                color: isAssign ? '#4ade80' : isRemove ? '#f87171' : GOLD,
                                border: `1px solid ${isAssign ? 'rgba(74,222,128,0.2)' : isRemove ? 'rgba(239,68,68,0.2)' : `${GOLD}20`}`,
                              }}>
                              {isAssign ? '↑ ASIGNÓ' : isRemove ? '↓ RETIRÓ' : '↔ CAMBIÓ'}
                            </span>
                            {/* Target */}
                            {log.target_name && (
                              <span className="text-xs" style={{ color: CELESTE }}>
                                a <strong>{log.target_name}</strong>
                              </span>
                            )}
                          </div>
                          <div className="text-xs leading-relaxed" style={{ color: `${GOLD}50` }}>{log.details}</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs whitespace-nowrap" style={{ color: '#3a4a60' }}>
                            {format(new Date(log.created_at), 'd MMM HH:mm', { locale: es })}
                          </div>
                          <div className="text-xs mt-0.5 font-mono" style={{ color: '#2a3a50' }}>{log.ip}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────── */}
      {modalMember && (
        <RankAssignModal
          member={modalMember}
          callerRankId={callerRankId}
          onClose={() => setModalMember(null)}
          onSuccess={onModalSuccess}
        />
      )}
    </div>
  )
}
