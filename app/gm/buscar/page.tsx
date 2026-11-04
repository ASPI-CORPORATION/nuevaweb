'use client'

import { useState } from 'react'
import { Search, Shield, User, Ban, Zap, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlayerData {
  account: { id: number; username: string; email: string; last_ip: string; online: number; expansion: number; joindate: string }
  gmlevel: number
  banned: boolean
  characters: Array<{ guid: number; name: string; level: number; class: number; online: number }>
}

export default function GmBuscarPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PlayerData | null>(null)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/gm/player?q=${encodeURIComponent(query)}`)
      if (res.ok) setResult(await res.json())
      else setError('Jugador no encontrado')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const doAction = async (action: string, params: Record<string, unknown> = {}) => {
    setActionMsg('')
    const res = await fetch('/api/gm/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    })
    const data = await res.json()
    setActionMsg(data.message || data.error || 'Acción ejecutada')
  }

  const CLASS_COLORS: Record<number, string> = {
    1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569',
    5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0',
    9: '#9482C9', 11: '#FF7D0A',
  }

  return (
    <div className="space-y-6">
      <h1 className="font-['Cinzel'] font-black text-3xl text-white">Buscar Jugador</h1>

      {/* Search box */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search() }}
            placeholder="Nombre de cuenta o personaje..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="px-6 py-3 bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}
      {actionMsg && <div className="text-blue-400 text-sm p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">{actionMsg}</div>}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Account info */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-['Cinzel'] font-bold text-xl text-white">{result.account.username}</h2>
                  {result.banned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium">BANEADO</span>
                  )}
                  {result.gmlevel > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 font-medium">
                      GM {result.gmlevel}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400 space-y-0.5">
                  <div>Email: <span className="text-slate-300">{result.account.email}</span></div>
                  <div>Última IP: <span className="text-slate-300 font-mono">{result.account.last_ip}</span></div>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs ${result.account.online ? 'text-green-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${result.account.online ? 'bg-green-400' : 'bg-slate-600'}`} />
                {result.account.online ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700/50">
              {!result.banned ? (
                <button
                  onClick={() => {
                    const reason = prompt('Motivo del baneo:')
                    const duration = prompt('Duración (0=permanente, 1d, 7d, 30d):') || '0'
                    if (reason) doAction('ban', { accountName: result.account.username, reason, duration })
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" /> Banear
                </button>
              ) : (
                <button
                  onClick={() => doAction('unban', { accountName: result.account.username })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded-lg text-xs font-medium transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" /> Desbanear
                </button>
              )}
            </div>
          </div>

          {/* Characters */}
          {result.characters.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/40">
                <h3 className="font-semibold text-white">Personajes ({result.characters.length})</h3>
              </div>
              <div className="divide-y divide-slate-700/30">
                {result.characters.map(char => (
                  <div key={char.guid} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <span className="font-medium" style={{ color: CLASS_COLORS[char.class] || '#fff' }}>
                        {char.name}
                      </span>
                      <span className="text-slate-500 ml-2">Nivel {char.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {char.online ? <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> : null}
                      <button
                        onClick={() => doAction('kick', { characterName: char.name })}
                        className="text-xs px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors"
                      >
                        Kick
                      </button>
                      <button
                        onClick={() => doAction('revive', { characterName: char.name })}
                        className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      >
                        Revivir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
