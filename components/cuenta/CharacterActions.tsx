'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Heart, ChevronDown } from 'lucide-react'

export function CharacterActions({ characterName, isOnline }: { characterName: string; isOnline: boolean }) {
  const [loading, setLoading] = useState('')
  const [msg, setMsg] = useState('')

  const action = async (type: string) => {
    setLoading(type)
    setMsg('')
    try {
      const res = await fetch('/api/cuenta/character-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName, action: type }),
      })
      const data = await res.json()
      setMsg(data.message || data.error || 'Listo')
    } catch {
      setMsg('Error de conexión')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={() => action('unstuck')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      >
        <Zap className="w-3.5 h-3.5" /> Unstuck
      </button>
      <button
        onClick={() => action('revive')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      >
        <Heart className="w-3.5 h-3.5" /> Revivir
      </button>
      {msg && (
        <span className="text-xs text-slate-400 italic">{msg}</span>
      )}
    </div>
  )
}
