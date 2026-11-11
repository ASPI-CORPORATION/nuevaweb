'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Network, Plus, Pencil, Power, Users, ChevronDown, History } from 'lucide-react'
import { fetcher, fmtDate, PageHeader, EmptyState, Skeletons, ErrorBox, Pill, inputCls } from '@/components/gm/ui'
import { StaffSubnav, Sheet, Field, FormError, runAction, selectCls, textareaCls } from '@/components/directivos/staff/kit'
import { DivisionAssignForm, ReasonModal } from '@/components/directivos/staff/modals'
import { DIVISION_ROLES, DIVISION_ROLE_LABEL, type DivisionRole } from '@/lib/staff/ranks'

interface Division {
  id: number; slug: string; name: string; description: string; color: string; active: boolean; members: number
  leads: Array<{ accountId: number; username: string; role: DivisionRole }>
}

export default function DivisionesPage() {
  const { data, error, mutate } = useSWR<{ divisions: Division[] }>('/api/directivos/divisiones', fetcher)
  const [editing, setEditing] = useState<Division | 'new' | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [toggle, setToggle] = useState<Division | null>(null)
  const divisions = data?.divisions ?? []

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Equipo" title="Gestión de Divisiones"
        description="Organización interna del staff de WoW Argentina. Las divisiones y sus cargos son administrativos: no otorgan permisos RBAC, acceso a Directivos ni comandos en el juego."
        actions={<button onClick={() => setEditing('new')} className="btn-gold uppercase tracking-wider"><Plus className="w-4 h-4" /> Nueva división</button>} />
      <StaffSubnav />
      <ErrorBox error={error} />

      <section className="panel-card p-4 sm:p-6 border-[#F6B40E]/25">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-[#F6B40E]" /> Asignar división</h2>
        <DivisionAssignForm onDone={() => mutate()} />
      </section>

      {!data ? <Skeletons rows={3} h="h-28" /> : divisions.length === 0 ? <EmptyState icon={Network} title="No hay divisiones" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {divisions.map(d => (
            <article key={d.id} className={`panel-card p-4 flex flex-col ${d.active ? '' : 'opacity-60'}`} style={{ borderColor: `${d.color}40` }}>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: d.color, boxShadow: `0 0 10px ${d.color}` }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-['Cinzel'] font-bold text-white break-words">{d.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 break-words">{d.description || 'Sin descripción'}</p>
                </div>
                {!d.active && <Pill color="#94a3b8">Desactivada</Pill>}
              </div>
              <div className="mt-3 text-xs text-slate-400 space-y-1">
                <div><span className="text-white font-semibold">{d.members}</span> miembro{d.members === 1 ? '' : 's'}</div>
                {d.leads.length > 0 && <div className="break-words">{d.leads.map(l => `${DIVISION_ROLE_LABEL[l.role]}: ${l.username}`).join(' · ')}</div>}
              </div>
              <div className="mt-auto pt-3 flex flex-wrap gap-2">
                <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="btn-ghost px-2.5 py-1.5 text-xs" aria-expanded={openId === d.id}>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openId === d.id ? 'rotate-180' : ''}`} /> Miembros
                </button>
                <button onClick={() => setEditing(d)} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                <button onClick={() => setToggle(d)} className={`btn-ghost px-2.5 py-1.5 text-xs ${d.active ? 'text-red-300' : 'text-green-300'}`}><Power className="w-3.5 h-3.5" /> {d.active ? 'Desactivar' : 'Reactivar'}</button>
              </div>
              {openId === d.id && <DivisionMembers id={d.id} onChanged={() => mutate()} />}
            </article>
          ))}
        </div>
      )}

      {editing && <DivisionEditor division={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => mutate()} />}
      {toggle && (
        <ReasonModal open title={toggle.active ? 'Desactivar división' : 'Reactivar división'} subtitle={toggle.name}
          text={toggle.active ? 'No se podrán asignar nuevos miembros. Los miembros actuales y el historial se conservan.' : 'La división vuelve a estar disponible para asignaciones.'}
          label="Motivo" confirmLabel={toggle.active ? 'Desactivar' : 'Reactivar'} danger={toggle.active} onClose={() => setToggle(null)}
          onSubmit={async reason => {
            const r = await runAction(`/api/directivos/divisiones/${toggle.id}`, 'PATCH', { active: !toggle.active, reason })
            if (!r.ok) return r.data.error ?? 'No se pudo actualizar.'
            mutate(); return null
          }} />
      )}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function DivisionMembers({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { data, error, mutate } = useSWR(`/api/directivos/divisiones/${id}`, fetcher)
  const [modal, setModal] = useState<{ kind: 'role' | 'remove'; m: any } | null>(null)
  const [role, setRole] = useState<DivisionRole>('miembro')
  const [showHistory, setShowHistory] = useState(false)
  const d = data?.division
  const done = () => { mutate(); onChanged() }
  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <ErrorBox error={error} />
      {!d ? <Skeletons rows={2} h="h-10" /> : (
        <>
          {d.members.length === 0 ? <p className="text-xs text-slate-500">Sin miembros.</p> : (
            <ul className="space-y-1.5">
              {d.members.map((m: any) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <Link href={`/directivos/staff/${m.account_id}`} className="text-white hover:underline truncate min-w-0">{m.username}</Link>
                  <span className="text-[11px] text-slate-400 shrink-0">{DIVISION_ROLE_LABEL[m.role as DivisionRole]}</span>
                  <span className="ml-auto flex gap-1 shrink-0">
                    <button onClick={() => { setRole(m.role); setModal({ kind: 'role', m }) }} className="px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:bg-white/5" aria-label={`Cambiar cargo de ${m.username}`}>Cargo</button>
                    <button onClick={() => setModal({ kind: 'remove', m })} className="px-2 py-1 rounded-lg text-[11px] text-red-300 hover:bg-red-500/10" aria-label={`Quitar a ${m.username}`}>Quitar</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setShowHistory(v => !v)} className="mt-3 text-xs text-[#74ACDF] inline-flex items-center gap-1"><History className="w-3.5 h-3.5" /> Historial de asignaciones ({d.history.length})</button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
              {d.history.map((h: any) => (
                <li key={h.id} className="break-words">
                  <span className="text-slate-200">{h.username}</span> · {DIVISION_ROLE_LABEL[h.role as DivisionRole]} · asignado {fmtDate(h.assigned_at, false)} por {h.assignedByName}
                  {h.active ? '' : ` · retirado ${fmtDate(h.removed_at, false)} (${h.removed_reason ?? ''})`}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {modal && (
        <ReasonModal open title={modal.kind === 'role' ? 'Cambiar cargo' : 'Quitar de la división'} subtitle={`${modal.m.username} · ${d?.name}`}
          confirmLabel={modal.kind === 'role' ? 'Guardar cargo' : 'Quitar'} danger={modal.kind === 'remove'} onClose={() => setModal(null)}
          text={modal.kind === 'role' ? 'Si elegís Responsable y ya hay uno, el anterior pasa a Miembro.' : undefined}
          onSubmit={async reason => {
            const body = modal.kind === 'role' ? { action: 'role', role, reason } : { action: 'remove', reason }
            const r = await runAction(`/api/directivos/divisiones/${id}/miembros/${modal.m.account_id}`, 'PATCH', body)
            if (!r.ok) return r.data.error ?? 'No se pudo actualizar.'
            done(); return null
          }}>
          {modal.kind === 'role' && (
            <Field label="Nuevo cargo" htmlFor="dm-role">
              <select id="dm-role" value={role} onChange={e => setRole(e.target.value as DivisionRole)} className={selectCls}>
                {DIVISION_ROLES.map(r => <option key={r} value={r}>{DIVISION_ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
          )}
        </ReasonModal>
      )}
    </div>
  )
}

const COLORS = ['#74ACDF', '#F6B40E', '#FFFFFF', '#4ade80', '#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#f87171']

function DivisionEditor({ division, onClose, onDone }: { division: Division | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(division?.name ?? '')
  const [description, setDescription] = useState(division?.description ?? '')
  const [color, setColor] = useState(division?.color ?? '#74ACDF')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (name.trim().length < 3) return setError('El nombre debe tener al menos 3 caracteres.')
    setBusy(true); setError('')
    const body = { name: name.trim(), description: description.trim(), color }
    const r = division
      ? await runAction(`/api/directivos/divisiones/${division.id}`, 'PATCH', body)
      : await runAction('/api/directivos/divisiones', 'POST', body)
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'No se pudo guardar.')
    onDone(); onClose()
  }
  return (
    <Sheet open title={division ? 'Editar división' : 'Nueva división'} onClose={onClose} busy={busy}
      footer={<><button onClick={onClose} disabled={busy} className="btn-ghost">Cancelar</button><button onClick={save} disabled={busy} className="btn-gold uppercase tracking-wider">{division ? 'Guardar cambios' : 'Crear división'}</button></>}>
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="dv-name"><input id="dv-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} className={inputCls} /></Field>
        <Field label="Descripción" htmlFor="dv-desc"><textarea id="dv-desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={300} className={textareaCls} /></Field>
        <fieldset>
          <legend className="text-sm font-medium text-slate-300">Color</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
        <FormError message={error} />
      </div>
    </Sheet>
  )
}
