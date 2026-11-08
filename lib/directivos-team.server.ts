import { z } from 'zod'
import { AUTH_DB, queryCms, queryCmsFirst } from '@/lib/db'
import { OWNER_ACCOUNT_ID, type DirectivoRank } from '@/lib/roles'

export interface TeamMemberRow {
  id: number
  account_id: number
  username: string | null
  nombre_directivo: string
  rango: DirectivoRank
  activo: number
  protegido: number
  fecha_ingreso: Date
  agregado_por: number | null
  agregado_por_usuario: string | null
  fecha_baja: Date | null
  removido_por: number | null
  removido_por_usuario: string | null
}

export async function listTeam(): Promise<TeamMemberRow[]> {
  return queryCms<TeamMemberRow>(
    `SELECT d.id, d.account_id, a.username, d.nombre_directivo, d.rango, d.activo, d.protegido,
            d.fecha_ingreso, d.agregado_por, ad.username AS agregado_por_usuario,
            d.fecha_baja, d.removido_por, rm.username AS removido_por_usuario
     FROM wowargentina_directivos d
     LEFT JOIN ${AUTH_DB}.account a  ON a.id  = d.account_id
     LEFT JOIN ${AUTH_DB}.account ad ON ad.id = d.agregado_por
     LEFT JOIN ${AUTH_DB}.account rm ON rm.id = d.removido_por
     ORDER BY d.fecha_baja IS NOT NULL, d.rango = 'propietario' DESC, d.fecha_ingreso ASC`
  )
}

export async function getTeamRow(accountId: number) {
  return queryCmsFirst<{
    account_id: number; nombre_directivo: string; rango: DirectivoRank; activo: number; protegido: number; fecha_baja: Date | null
  }>(
    'SELECT account_id, nombre_directivo, rango, activo, protegido, fecha_baja FROM wowargentina_directivos WHERE account_id = ?',
    [accountId]
  )
}

/** The Propietario row and the bootstrap account are never editable from the panel. */
export function isProtectedMember(row: { account_id: number; rango: DirectivoRank; protegido: number }) {
  return row.account_id === OWNER_ACCOUNT_ID || row.rango === 'propietario' || !!row.protegido
}

export const addMemberSchema = z.object({
  accountId: z.coerce.number({ message: 'Ingresá un ID de cuenta válido.' })
    .int('El ID de cuenta debe ser un número entero.')
    .positive('El ID de cuenta debe ser mayor que 0.')
    .max(4_294_967_295, 'ID de cuenta inválido.'),
  nombre: z.string().trim()
    .min(2, 'El nombre del Directivo debe tener al menos 2 caracteres.')
    .max(60, 'El nombre del Directivo admite hasta 60 caracteres.')
    .refine(v => !/[\u0000-\u001f<>]/.test(v), 'El nombre contiene caracteres no permitidos.'),
})

export function parseAccountIdParam(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}
