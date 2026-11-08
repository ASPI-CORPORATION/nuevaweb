'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Ban, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { notify } from '@/components/ui/toaster'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type BanAction = 'ban_account' | 'unban_account' | 'ban_ip'

export default function DirectivosBAneosPage() {
  const { data, mutate } = useSWR('/api/directivos/ban', fetcher)
  const bans = data?.bans ?? []

  const [form, setForm] = useState({ action: 'ban_account' as BanAction, identifier: '', reason: '', duration: '0' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const handleAction = async () => {
    if (!form.identifier.trim() || !form.reason.trim()) { setErr('Completá todos los campos'); return }
    setSaving(true); setErr(''); setMsg('')
    const res = await fetch('/api/directivos/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setErr(data.error)
      notify.error(res.status === 403 ? 'Permiso denegado' : 'No se pudo completar la operación', data.error || 'Ocurrió un problema. Intentá nuevamente.')
      return
    }
    const who = form.identifier.trim()
    if (form.action === 'ban_account') notify.success('Usuario baneado', `El usuario ${who} ha sido baneado con éxito.`)
    else if (form.action === 'unban_account') notify.success('Usuario desbaneado', `El usuario ${who} ya puede volver a ingresar.`)
    else notify.success('IP baneada', `La IP ${who} ha sido bloqueada con éxito.`)
    setMsg(data.message)
    setForm(f => ({ ...f, identifier: '', reason: '' }))
    mutate()
  }

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-6" style={{ color: '#F6B40E' }}>Baneos</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
          <h2 className="font-semibold text-white mb-4">Ejecutar acción</h2>
          {err && <div className="mb-3 px-3 py-2 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm">{err}</div>}
          {msg && <div className="mb-3 px-3 py-2 bg-green-500/15 border border-green-500/30 text-green-400 rounded-xl text-sm">{msg}</div>}

          <div className="space-y-3">
            <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value as BanAction }))}
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={{ border: '1px solid rgba(246, 180, 14,0.2)' }}>
              <option value="ban_account">Banear cuenta</option>
              <option value="unban_account">Desbanear cuenta</option>
              <option value="ban_ip">Banear IP</option>
            </select>
            <input value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
              placeholder={form.action === 'ban_ip' ? 'Dirección IP' : 'Nombre de cuenta'}
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={{ border: '1px solid rgba(246, 180, 14,0.2)' }} />
            {form.action !== 'unban_account' && (
              <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="Duración en días (0 = permanente)"
                className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none" style={{ border: '1px solid rgba(246, 180, 14,0.2)' }} />
            )}
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Motivo *" rows={3} className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm outline-none resize-none" style={{ border: '1px solid rgba(246, 180, 14,0.2)' }} />
            <button onClick={handleAction} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm text-black"
              style={{ background: 'linear-gradient(135deg, #F6B40E, #B8860B)', opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Ejecutar
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(246, 180, 14,0.03)', border: '1px solid rgba(246, 180, 14,0.1)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(246, 180, 14,0.1)' }}>
          <h2 className="font-semibold text-white">Baneos activos</h2>
        </div>
        <div className="table-scroll"><table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(246, 180, 14,0.08)' }}>
              {['Usuario', 'Motivo', 'Baneado por', 'Fecha'].map(h => (
                <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: '#a89060' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bans.map((b: { id: number; username: string; banreason: string; bannedby: string; bandate: number }) => (
              <tr key={b.id} style={{ borderBottom: '1px solid rgba(246, 180, 14,0.05)' }}>
                <td className="px-5 py-3 font-medium text-white">{b.username}</td>
                <td className="px-5 py-3 text-sm" style={{ color: '#a89060' }}>{b.banreason}</td>
                <td className="px-5 py-3 text-sm" style={{ color: '#a89060' }}>{b.bannedby}</td>
                <td className="px-5 py-3 text-xs" style={{ color: '#a89060' }}>
                  {format(new Date(b.bandate * 1000), 'd MMM yyyy', { locale: es })}
                </td>
              </tr>
            ))}
            {bans.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">No hay baneos activos</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
