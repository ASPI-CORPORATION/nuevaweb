'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Save, Loader2 } from 'lucide-react'
import { DISCORD_URL } from '@/lib/site-config'
import { notify } from '@/components/ui/toaster'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminConfigPage() {
  const { data, mutate } = useSWR('/api/admin/config', fetcher)
  const cfg = data?.config ?? {}

  const [form, setForm] = useState({
    maintenance_mode: '0',
    motd: '',
    discord_url: DISCORD_URL,
    topg_url: '',
    wowservers_url: '',
    vote_cooldown_hours: '12',
    vote_coins_reward: '1',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Copy loaded config into the form once per fetch (during render, not in an effect)
  const [loadedCfg, setLoadedCfg] = useState<unknown>(null)
  if (cfg && Object.keys(cfg).length > 0 && cfg !== loadedCfg) {
    setLoadedCfg(cfg)
    setForm(f => ({
      maintenance_mode: cfg.maintenance_mode ?? f.maintenance_mode,
      motd: cfg.motd ?? f.motd,
      discord_url: DISCORD_URL,
      topg_url: cfg.topg_url ?? f.topg_url,
      wowservers_url: cfg.wowservers_url ?? f.wowservers_url,
      vote_cooldown_hours: cfg.vote_cooldown_hours ?? f.vote_cooldown_hours,
      vote_coins_reward: cfg.vote_coins_reward ?? f.vote_coins_reward,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}))
      notify.error(d?.error || 'No se pudo guardar la configuración')
      return
    }
    notify.success('Configuración guardada')
    setSaved(true)
    mutate()
    setTimeout(() => setSaved(false), 2000)
  }

  const renderField = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 text-white rounded-xl outline-none focus:border-[#74ACDF] text-sm"
      />
    </div>
  )

  return (
    <div>
      <h1 className="font-['Cinzel'] font-black text-3xl text-white mb-6">Configuración</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Servidor</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Modo mantenimiento</label>
              <div className="flex gap-3">
                {(['0', '1'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={v} checked={form.maintenance_mode === v} onChange={() => setForm(f => ({ ...f, maintenance_mode: v }))} className="accent-[#74ACDF]" />
                    <span className="text-sm text-slate-300">{v === '0' ? 'Desactivado' : 'Activado'}</span>
                  </label>
                ))}
              </div>
            </div>
            {renderField({ label: "MOTD (Mensaje del día)", name: "motd", placeholder: "Bienvenidos a WoW Argentina!" })}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Comunidad</h2>
          <div className="space-y-4">
            <div className="sm:col-span-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 text-sm">
              <div className="text-slate-300 font-medium">Discord oficial</div>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-[#a5b4fc] break-all hover:underline">{DISCORD_URL}</a>
              <div className="text-xs text-slate-500 mt-1">Centralizado en lib/site-config.ts y usado en toda la web.</div>
            </div>
            {renderField({ label: "TopG URL", name: "topg_url", placeholder: "https://topg.org/..." })}
            {renderField({ label: "WoW-Servers URL", name: "wowservers_url", placeholder: "https://wow-servers.eu/..." })}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Votos</h2>
          <div className="grid grid-cols-2 gap-4">
            {renderField({ label: "Cooldown (horas)", name: "vote_cooldown_hours", type: "number", placeholder: "12" })}
            {renderField({ label: "Recompensa (monedas)", name: "vote_coins_reward", type: "number", placeholder: "1" })}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#74ACDF] hover:bg-[#8cc0ec] text-[#050A14] font-semibold rounded-xl font-medium disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
