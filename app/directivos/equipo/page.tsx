'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Crown, UserPlus, Lock, Loader2, Trash2, Power, PowerOff, ShieldCheck, History, Users } from 'lucide-react'
import { ConfirmDialog } from '@/components/panel/ConfirmDialog'
import { notify } from '@/components/ui/toaster'

interface Member {
  id: number
  account_id: number
  username: string | null
  nombre_directivo: string
  rango: 'propietario' | 'directivo'
  activo: number
  protegido: number
  fecha_ingreso: string
  agregado_por: number | null
  agregado_por_usuario: string | null
  fecha_baja: string | null
  removido_por_usuario: string | null
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'No se pudo cargar el equipo de Directivos.')
  return d
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

function RankBadge({ m }: { m: Member }) {
  return m.rango === 'propietario' ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#F6B40E] text-[#1a1200]">
      <Crown className="w-3 h-3" /> Máxima Autoridad
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#74ACDF]/40 text-[#cfe6f8] bg-[#74ACDF]/10">
      <ShieldCheck className="w-3 h-3" /> Directivo
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-green-400' : 'text-slate-400'}`}>
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-400' : 'bg-slate-500'}`} /> {active ? 'Activo' : 'Desactivado'}
    </span>
  )
}

export default function GestionDirectivosPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/directivos/miembros', fetcher)
  const members: Member[] = data?.members ?? []
  const canManage: boolean = !!data?.canManage
  const myId: number | undefined = data?.me
  const current = members.filter(m => !m.fecha_baja)
  const removed = members.filter(m => m.fecha_baja)

  const [accountId, setAccountId] = useState('')
  const [nombre, setNombre] = useState('')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [toRemove, setToRemove] = useState<Member | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const id = Number(accountId)
    if (!Number.isInteger(id) || id <= 0) { setFormError('Ingresá un ID de cuenta válido.'); return }
    if (nombre.trim().length < 2) { setFormError('Ingresá el nombre del Directivo.'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/directivos/miembros', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: id, nombre: nombre.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(d.error || 'No se pudo completar la operación.')
        notify.error(res.status === 404 ? 'Cuenta inexistente' : res.status === 403 ? 'Permiso denegado' : 'No se pudo añadir al Directivo', d.error)
        return
      }
      notify.success('Directivo añadido', `El usuario ${d.member.username} ha sido incorporado al equipo de Directivos.`)
      setAccountId('')
      setNombre('')
      mutate()
    } catch {
      notify.error('No se pudo completar la operación', 'Ocurrió un problema de conexión. Intentá nuevamente.')
    } finally {
      setAdding(false)
    }
  }

  const toggle = async (m: Member) => {
    setBusy(m.account_id)
    try {
      const res = await fetch(`/api/directivos/miembros/${m.account_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !m.activo }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { notify.error('No se pudo completar la operación', d.error); return }
      notify.success(d.activo ? 'Acceso activado' : 'Acceso desactivado',
        `${m.username ?? 'El miembro'} ${d.activo ? 'vuelve a tener' : 'ya no tiene'} acceso al Panel de Directivos.`)
      mutate()
    } catch {
      notify.error('No se pudo completar la operación', 'Ocurrió un problema de conexión. Intentá nuevamente.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!toRemove) return
    setBusy(toRemove.account_id)
    try {
      const res = await fetch(`/api/directivos/miembros/${toRemove.account_id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { notify.error('No se pudo eliminar al Directivo', d.error); return }
      notify.success('Directivo eliminado', `${d.username} ya no forma parte del equipo de Directivos.`)
      setToRemove(null)
      mutate()
    } catch {
      notify.error('No se pudo completar la operación', 'Ocurrió un problema de conexión. Intentá nuevamente.')
    } finally {
      setBusy(null)
    }
  }

  const renderActions = (m: Member) => {
    if (m.rango === 'propietario' || m.protegido) {
      return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F6B40E]"><Lock className="w-3.5 h-3.5" /> Protegido</span>
    }
    if (!canManage) return <span className="text-xs text-slate-500">Solo el Propietario</span>
    if (m.account_id === myId) return <span className="text-xs text-slate-500">Tu cuenta</span>
    return (
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button onClick={() => toggle(m)} disabled={busy === m.account_id}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/15 text-slate-200 hover:bg-white/5 disabled:opacity-50">
          {busy === m.account_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : m.activo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          {m.activo ? 'Desactivar' : 'Activar'}
        </button>
        <button onClick={() => setToRemove(m)} disabled={busy === m.account_id}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white bg-red-600/90 hover:bg-red-600 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> Eliminar directivo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="eyebrow">Equipo</span>
        <h1 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-white mt-1">Gestión de Directivos</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Quién puede entrar al Panel de Directivos. Es independiente de los permisos del juego: incorporar a alguien acá
          no le otorga GM ni rangos RBAC dentro de AzerothCore.
        </p>
      </header>

      {canManage ? (
        <form onSubmit={add} className="panel-card p-4 sm:p-6 border-[#F6B40E]/25" noValidate>
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4"><UserPlus className="w-4 h-4 text-[#F6B40E]" /> Añadir miembro Directivo</h2>
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">ID de Cuenta:</span>
              <input type="number" inputMode="numeric" min={1} step={1} value={accountId} onChange={e => setAccountId(e.target.value)}
                placeholder="Ej: 2" className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none font-mono" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Nombre del Directivo:</span>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={60}
                placeholder="Ej: Administrador General" className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none" required />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">El ID debe existir en <code>acore_auth.account</code>. El nombre es solo visual; no reemplaza el usuario real.</p>
          {formError && <div className="mt-3 px-3.5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300" role="alert">{formError}</div>}
          <button type="submit" disabled={adding} className="btn-gold mt-4 w-full sm:w-auto uppercase tracking-wider">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Añadir directivo
          </button>
        </form>
      ) : data && (
        <div className="px-4 py-3 rounded-xl border border-[#74ACDF]/25 bg-[#74ACDF]/10 text-sm text-[#cfe6f8]">
          Solo el Propietario puede añadir o eliminar miembros del equipo de Directivos.
        </div>
      )}

      {error && <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">{error.message}</div>}

      <section className="panel-card overflow-hidden" aria-labelledby="dir-actuales">
        <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between gap-2">
          <h2 id="dir-actuales" className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-[#74ACDF]" /> Directivos actuales</h2>
          <span className="text-xs text-slate-500">{current.length} miembros</span>
        </div>

        {isLoading && <div className="p-4 space-y-2">{[0, 1].map(i => <div key={i} className="h-16 skeleton" />)}</div>}

        {/* Desktop table */}
        {!isLoading && current.length > 0 && (
          <div className="hidden md:block table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="px-6 py-3 font-medium">ID Cuenta</th>
                  <th className="px-3 py-3 font-medium">Usuario WoW</th>
                  <th className="px-3 py-3 font-medium">Nombre Directivo</th>
                  <th className="px-3 py-3 font-medium">Rango</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {current.map(m => (
                  <tr key={m.id}>
                    <td className="px-6 py-4 font-mono text-[#F6B40E]">{m.account_id}</td>
                    <td className="px-3 py-4 text-white font-medium">{m.username ?? <span className="text-red-400">Cuenta inexistente</span>}</td>
                    <td className="px-3 py-4">
                      <div className="text-slate-200">{m.nombre_directivo}</div>
                      <div className="text-xs text-slate-500">Desde {fmt(m.fecha_ingreso)} · {m.agregado_por_usuario ? `por ${m.agregado_por_usuario}` : 'por migración'}</div>
                    </td>
                    <td className="px-3 py-4"><RankBadge m={m} /></td>
                    <td className="px-3 py-4"><StatusBadge active={!!m.activo} /></td>
                    <td className="px-6 py-4 text-right">{renderActions(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!isLoading && current.length > 0 && (
          <ul className="md:hidden divide-y divide-white/5">
            {current.map(m => (
              <li key={m.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-semibold truncate">{m.username ?? 'Cuenta inexistente'}</div>
                    <div className="text-sm text-slate-300 break-words">{m.nombre_directivo}</div>
                    <div className="text-xs text-slate-500 mt-0.5">ID {m.account_id} · desde {fmt(m.fecha_ingreso)}{m.agregado_por_usuario ? ` · por ${m.agregado_por_usuario}` : ''}</div>
                  </div>
                  <RankBadge m={m} />
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <StatusBadge active={!!m.activo} />
                  {renderActions(m)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !error && current.length === 0 && (
          <p className="p-6 text-sm text-slate-400">No hay Directivos registrados. Ejecutá la migración <code>2026_11_wowargentina_directivos.sql</code>.</p>
        )}
      </section>

      {removed.length > 0 && (
        <details className="panel-card group">
          <summary className="px-4 sm:px-6 py-4 cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-slate-300 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><History className="w-4 h-4" /> Historial de bajas ({removed.length})</span>
            <span className="text-xs text-slate-500 group-open:hidden">Ver</span>
          </summary>
          <ul className="divide-y divide-white/5 border-t border-white/5">
            {removed.map(m => (
              <li key={m.id} className="px-4 sm:px-6 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="text-white font-medium">{m.username ?? `#${m.account_id}`}</span>
                <span className="text-slate-400">{m.nombre_directivo}</span>
                <span className="text-xs text-slate-500 sm:ml-auto">Eliminado el {fmt(m.fecha_baja)}{m.removido_por_usuario ? ` por ${m.removido_por_usuario}` : ''}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={!!toRemove}
        warning
        danger
        title="Confirmar eliminación"
        message={<>
          ¿Estás seguro de que querés eliminar a este miembro del equipo de Directivos?
          <span className="block mt-2 text-[#F6B40E]">Esta acción revocará el acceso de <strong>{toRemove?.username}</strong> ({toRemove?.nombre_directivo}).</span>
        </>}
        confirmLabel="Confirmar eliminación"
        busy={busy === toRemove?.account_id}
        onConfirm={remove}
        onCancel={() => setToRemove(null)}
      />
    </div>
  )
}
