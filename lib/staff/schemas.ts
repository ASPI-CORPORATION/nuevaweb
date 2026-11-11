import { z } from 'zod'
import { RANK_KEYS, DIVISION_ROLES, WARNING_TYPES, WARNING_STATUSES } from '@/lib/staff/ranks'

const reason = z.string().trim().min(5, 'El motivo es obligatorio (mínimo 5 caracteres).').max(300, 'El motivo es demasiado largo (máximo 300).')
const rank = z.enum(RANK_KEYS as [string, ...string[]], { message: 'Rango inválido.' })
const divisionRole = z.enum(DIVISION_ROLES)

export const rankChangeSchema = z.object({
  mode: z.enum(['incorporar', 'asignar', 'ascender', 'degradar']),
  rank,
  reason,
  confirm: z.string().max(32).optional(),
  kick: z.boolean().optional(),
  divisionId: z.number().int().positive().optional(),
  divisionRole: divisionRole.optional(),
})

export const retireSchema = z.object({
  reason,
  notes: z.string().trim().max(1000).optional(),
  confirm: z.string().max(32).optional(),
  kick: z.boolean().optional(),
})

export const warningSchema = z.object({
  type: z.enum(WARNING_TYPES),
  reason: z.string().trim().min(5, 'El motivo es obligatorio (mínimo 5 caracteres).').max(200),
  description: z.string().trim().max(2000).optional(),
})

export const warningStatusSchema = z.object({
  status: z.enum(WARNING_STATUSES),
  note: z.string().trim().max(300).optional(),
})

const isoDate = z.string().trim().min(10).max(40)
export const suspensionSchema = z.object({
  scope: z.enum(['interna', 'juego']),
  startsAt: isoDate.optional(),
  endsAt: isoDate,
  reason,
  notes: z.string().trim().max(1000).optional(),
  kick: z.boolean().optional(),
})

export const suspensionActionSchema = z.object({
  action: z.enum(['lift', 'restore']),
  reason,
  kick: z.boolean().optional(),
})

export const profileSchema = z.object({
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
})

const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato #RRGGBB).')
export const divisionCreateSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(60),
  description: z.string().trim().max(300).default(''),
  color: color.default('#74ACDF'),
})
export const divisionUpdateSchema = z.object({
  name: z.string().trim().min(3).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  color: color.optional(),
  active: z.boolean().optional(),
  reason: z.string().trim().max(300).optional(),
})

export const assignDivisionSchema = z.object({
  accountId: z.number().int().positive({ message: 'ID de cuenta inválido.' }),
  role: divisionRole,
  reason,
})
export const membershipSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('role'), role: divisionRole, reason }),
  z.object({ action: z.literal('remove'), reason }),
])

export function firstIssue(err: z.ZodError) {
  return err.issues[0]?.message ?? 'Datos inválidos.'
}
