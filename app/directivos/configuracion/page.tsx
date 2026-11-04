'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Save, Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DirectivosConfiguracionPage() {
  const { data, mutate } = useSWR('/api/admin/config', fetcher)
  const cfg = data?.config ?? {}

  const [form, setForm] = useState({
    maintenance_mode: '0',
    motd: '',
    discord_url: '',
    topg_url: '',
    wowservers_url: '',
    vote_cooldown_hours: '12',
    vote_coins_reward: '1',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (cfg && Object.keys(cfg).length > 0) {
      setForm(f => ({
        maintenance_mode: cfg.maintenance_mode ?? f.maintenance_mode,
        motd: cfg.motd ?? f.motd,
        discord_url: cfg.discord_url ?? f.discord_url,
        topg_url: cfg.topg_url ?? f.topg_url,
        wowservers_url: cfg.wowservers_url ?? f.wowservers_url,
        vote_cooldown_hours: cfg.vote_cooldown_hours ?? f.vote_cooldown_hours,
        vote_coins_reward: cfg.vote_coins_reward ?? f.vote_coins_reward,
      }))
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    mutate()
    setTimeout(() => setSaved(false), 2000)
  }

  const goldStyle = { border: '1px solid rgba(255,215,0,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }

  const Field = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#a89060' }}>{label}</label>
      <input type={type} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ ...goldStyle, outlineColor: '#FFD700' }} />
    </div>
  )

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl mb-6" style={{ color: '#FFD700' }}>Configuración Global</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <h2 className="font-semibold text-white mb-4">Servidor</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#a89060' }}>Modo mantenimiento</label>
              <div className="flex gap-4">
                {(['0', '1'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={v} checked={form.maintenance_mode === v} onChange={() => setForm(f => ({ ...f, maintenance_mode: v }))}
                      style={{ accentColor: '#FFD700' }} />
                    <span className="text-sm text-white">{v === '0' ? 'Desactivado' : 'Activado'}</span>
                  </label>
                ))}
              </div>
            </div>
            <Field label="MOTD" name="motd" placeholder="Mensaje del día" />
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <h2 className="font-semibold text-white mb-4">Links</h2>
          <div className="space-y-4">
            <Field label="Discord" name="discord_url" />
            <Field label="TopG URL" name="topg_url" />
            <Field label="WoW-Servers URL" name="wowservers_url" />
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <h2 className="font-semibold text-white mb-4">Votos</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cooldown (horas)" name="vote_cooldown_hours" type="number" />
            <Field label="Recompensa (monedas)" name="vote_coins_reward" type="number" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium disabled:opacity-50 text-black"
          style={{ background: 'linear-gradient(135deg,#FFD700,#B8860B)' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
