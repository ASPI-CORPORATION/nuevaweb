'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Clock, Coins, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { notify } from '@/components/ui/toaster'

interface VoteStatus {
  site: string
  lastVote: Date | null
  canVote: boolean
  cooldownHours: number
}

interface VoteClientProps {
  session: { id: number; username: string } | null
  voteStatuses: VoteStatus[]
  myVotes: Array<{ site: string; created_at: Date; rewarded: number }>
  coinsReward: number
}

const SITE_INFO: Record<string, { label: string; url: string; color: string }> = {
  TopG: {
    label: 'TopG.org',
    url: 'https://topg.org',
    color: 'blue',
  },
  'WoW-Servers': {
    label: 'WoW-Servers.eu',
    url: 'https://www.wow-servers.eu',
    color: 'purple',
  },
}

export function VoteClient({ session, voteStatuses, myVotes, coinsReward }: VoteClientProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [statuses, setStatuses] = useState(voteStatuses)

  const handleVote = async (site: string) => {
    if (!session) return

    setLoading(site)
    setMessages({})

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        notify.success('Voto registrado', `¡Gracias por votar! Recibiste ${coinsReward} Moneda Argentina.`)
        setMessages({ [site]: `¡Voto registrado! +${coinsReward} Moneda Argentina` })
        // Update status
        setStatuses(prev => prev.map(s =>
          s.site === site ? { ...s, canVote: false, lastVote: new Date() } : s
        ))
      } else {
        notify.error('No se pudo registrar el voto', data.error || 'Ocurrió un problema. Intentá nuevamente.')
        setMessages({ [site]: data.error || 'Error al registrar el voto' })
      }
    } catch {
      notify.error('Error de conexión', 'Revisá tu conexión e intentá nuevamente.')
      setMessages({ [site]: 'Error de conexión' })
    } finally {
      setLoading(null)
    }
  }

  if (!session) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Coins className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-2">Iniciá sesión para votar</h3>
        <p className="text-slate-400 mb-6">Necesitás una cuenta para registrar tus votos y recibir Moneda Argentina.</p>
        <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors">
          Ingresar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Vote cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['TopG', 'WoW-Servers'] as const).map(site => {
          const info = SITE_INFO[site]
          const status = statuses.find(s => s.site === site)
          const canVote = status?.canVote ?? true
          const msg = messages[site]

          return (
            <motion.div
              key={site}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-900/60 border rounded-2xl p-6 ${canVote ? 'border-blue-500/30' : 'border-slate-700/50'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-lg text-white">{info.label}</h3>
                  {status?.lastVote && (
                    <p className="text-xs text-slate-500 mt-1">
                      Último voto: {formatDistanceToNow(new Date(status.lastVote), { addSuffix: true, locale: es })}
                    </p>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  canVote
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-slate-500 bg-slate-800/50 border-slate-700/50'
                }`}>
                  {canVote ? 'Disponible' : `Cooldown ${status?.cooldownHours}h`}
                </div>
              </div>

              {/* Reward */}
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span>Recompensa: <span className="text-yellow-400 font-semibold">+{coinsReward} Moneda Argentina</span></span>
              </div>

              {msg && (
                <div className={`p-3 rounded-xl text-sm mb-3 ${
                  msg.includes('¡') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {msg}
                </div>
              )}

              {!canVote && status?.lastVote && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Clock className="w-3 h-3" />
                  Podés volver a votar en{' '}
                  {formatDistanceToNow(
                    new Date(new Date(status.lastVote).getTime() + (status.cooldownHours * 3600000)),
                    { locale: es }
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/50 text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Ir al sitio
                </a>
                <button
                  onClick={() => handleVote(site)}
                  disabled={!canVote || loading === site}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    canVote && loading !== site
                      ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-700/40 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {loading === site ? 'Registrando...' : canVote ? 'Registrar Voto' : 'No disponible'}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Historial de votos */}
      {myVotes.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40">
            <h3 className="font-semibold text-white">Mis Votos Recientes</h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            {myVotes.map((vote, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  {vote.rewarded ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-white">{vote.site}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    vote.rewarded ? 'text-green-400 bg-green-500/10' : 'text-slate-400 bg-slate-700/40'
                  }`}>
                    {vote.rewarded ? 'Recompensado' : 'Pendiente'}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {formatDistanceToNow(new Date(vote.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
