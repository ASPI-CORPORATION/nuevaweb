import { queryAuthFirst, queryCharactersFirst, queryCms, executeCms, queryWorld } from '@/lib/db'
import { can, durationInfo, GM_TIER_SHORT } from '@/lib/gm/permissions'
import { type GmContext, getTargetInfo, hierarchyError, gmLog, DENIED } from '@/lib/gm/access.server'
import {
  soapBanAccount, soapUnbanAccount, soapBanCharacter, soapUnbanCharacter, soapMute, soapUnmute,
  soapKick, soapUnstuck, soapTeleName, reasonWithGm, sanitizeReason,
} from '@/lib/gm/soap-commands'
import { CAPITALS, defaultCapital, factionOf } from '@/lib/gm/wow-data'

export class ActionError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

const coreMessage = (out: string) => sanitizeReason(out || 'sin respuesta', 300)

async function loadAccountTarget(ctx: GmContext, accountId: number) {
  const target = await getTargetInfo(accountId)
  if (!target) throw new ActionError('No encontramos una cuenta con el ID indicado.', 404)
  const err = hierarchyError(ctx, target)
  if (err) {
    await gmLog(ctx, { action: 'ACCION_DENEGADA', targetAccountId: accountId, result: 'denegado', details: err })
    throw new ActionError(err, 403)
  }
  return target
}

export async function loadCharacter(guid: number) {
  return queryCharactersFirst<{ guid: number; name: string; account: number; race: number; online: number; level: number }>(
    'SELECT guid, name, account, race, online, level FROM characters WHERE guid = ? AND deleteInfos_Account IS NULL', [guid]
  )
}

function endsAt(durationKey: string): Date | null {
  const d = durationInfo(durationKey)
  if (!d || d.minutes < 0) return null
  return new Date(Date.now() + d.minutes * 60_000)
}

async function recordSanction(ctx: GmContext, s: {
  type: 'ban_account' | 'ban_character' | 'mute'; accountId: number; accountName: string
  characterGuid?: number; characterName?: string; reason: string; durationKey: string; coreOutput: string
}) {
  const r = await executeCms(
    `INSERT INTO cms_gm_sanctions (type, account_id, account_name, character_guid, character_name, gm_account_id, gm_name, gm_tier,
                                   reason, duration_key, ends_at, core_output)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.type, s.accountId, s.accountName, s.characterGuid ?? null, s.characterName ?? null, ctx.user.id, ctx.user.username, ctx.tier,
      s.reason, s.durationKey, endsAt(s.durationKey), coreMessage(s.coreOutput)]
  ).catch(err => { console.error('[gm] cms_gm_sanctions insert failed:', err?.message); return null })
  return r?.insertId ? `sancion#${r.insertId}` : null
}

/** GM 2 may only lift sanctions they applied themselves; GM 3 lifts any on non-protected accounts. */
async function assertCanRevoke(ctx: GmContext, type: 'ban_account' | 'ban_character' | 'mute', accountId: number, characterGuid?: number) {
  if (can(ctx.tier, 'unbanAny')) return
  if (!can(ctx.tier, 'unbanOwn')) throw new ActionError(DENIED, 403)
  const own = await queryCms<{ id: number }>(
    `SELECT id FROM cms_gm_sanctions WHERE type = ? AND account_id = ? AND status = 'activa' AND gm_account_id = ?
       ${characterGuid ? 'AND character_guid = ?' : ''} LIMIT 1`,
    characterGuid ? [type, accountId, ctx.user.id, characterGuid] : [type, accountId, ctx.user.id]
  )
  if (!own.length) throw new ActionError('Como GM nivel 2 solo podés revocar sanciones que aplicaste vos. Pedí la revisión a un GM nivel 3.', 403)
}

async function markRevoked(ctx: GmContext, type: string, accountId: number, characterGuid?: number) {
  await executeCms(
    `UPDATE cms_gm_sanctions SET status = 'revocada', revoked_by = ?, revoked_by_name = ?, revoked_at = NOW()
     WHERE type = ? AND account_id = ? AND status = 'activa' ${characterGuid ? 'AND character_guid = ?' : ''}`,
    characterGuid ? [ctx.user.id, ctx.user.username, type, accountId, characterGuid] : [ctx.user.id, ctx.user.username, type, accountId]
  ).catch(() => {})
}

const activeAccountBan = (id: number) => queryAuthFirst<{ bandate: number }>(
  'SELECT bandate FROM account_banned WHERE id = ? AND active = 1 AND (unbandate = bandate OR unbandate > UNIX_TIMESTAMP()) ORDER BY bandate DESC LIMIT 1', [id]
)
const activeCharacterBan = (guid: number) => queryCharactersFirst<{ bandate: number }>(
  'SELECT bandate FROM character_banned WHERE guid = ? AND active = 1 AND (unbandate = bandate OR unbandate > UNIX_TIMESTAMP()) ORDER BY bandate DESC LIMIT 1', [guid]
)

function requireReason(reason: string | undefined): string {
  const r = sanitizeReason(reason ?? '')
  if (r.length < 5) throw new ActionError('El motivo es obligatorio (mínimo 5 caracteres).')
  return r
}

// ── Account sanctions ───────────────────────────────────────────────────────

export async function banAccount(ctx: GmContext, accountId: number, durationKey: string, reasonRaw: string) {
  const d = durationInfo(durationKey)
  if (!d) throw new ActionError('Duración inválida.')
  if (!can(ctx.tier, d.minutes < 0 ? 'banAccountPerm' : 'banAccountTemp')) {
    throw new ActionError(d.minutes < 0 ? 'Solo un GM nivel 3 puede aplicar baneos permanentes.' : DENIED, 403)
  }
  const reason = requireReason(reasonRaw)
  const target = await loadAccountTarget(ctx, accountId)
  if (await activeAccountBan(accountId)) throw new ActionError(`La cuenta ${target.username} ya tiene un baneo activo.`, 409)

  const out = await soapBanAccount(target.username, durationKey, reasonWithGm(ctx.user.username, reason))
  if (!out.ok || !(await activeAccountBan(accountId))) {
    await gmLog(ctx, { action: 'BAN_CUENTA', targetAccountId: accountId, reason, result: 'error', details: `Worldserver: ${coreMessage(out.output)}` })
    throw new ActionError(`El servidor no aplicó la sanción: ${coreMessage(out.output)}`, 502)
  }
  const ref = await recordSanction(ctx, { type: 'ban_account', accountId, accountName: target.username, reason, durationKey, coreOutput: out.output })
  await gmLog(ctx, { action: 'BAN_CUENTA', targetAccountId: accountId, reason, result: 'ok', reference: ref, details: `Baneo de cuenta ${target.username} (${d.label})` })
  return { username: target.username, duration: d.label }
}

export async function unbanAccount(ctx: GmContext, accountId: number, reasonRaw?: string) {
  const target = await loadAccountTarget(ctx, accountId)
  if (!(await activeAccountBan(accountId))) throw new ActionError(`La cuenta ${target.username} no tiene un baneo activo.`, 409)
  await assertCanRevoke(ctx, 'ban_account', accountId)
  const reason = sanitizeReason(reasonRaw ?? '')

  const out = await soapUnbanAccount(target.username)
  if (!out.ok || (await activeAccountBan(accountId))) {
    await gmLog(ctx, { action: 'DESBAN_CUENTA', targetAccountId: accountId, reason, result: 'error', details: `Worldserver: ${coreMessage(out.output)}` })
    throw new ActionError(`El servidor no levantó la sanción: ${coreMessage(out.output)}`, 502)
  }
  await markRevoked(ctx, 'ban_account', accountId)
  await gmLog(ctx, { action: 'DESBAN_CUENTA', targetAccountId: accountId, reason, result: 'ok', details: `Sanción levantada a ${target.username}` })
  return { username: target.username }
}

async function pickCharacter(accountId: number, guid?: number) {
  const c = guid
    ? await loadCharacter(guid)
    : await queryCharactersFirst<{ guid: number; name: string; account: number; race: number; online: number; level: number }>(
        'SELECT guid, name, account, race, online, level FROM characters WHERE account = ? AND deleteInfos_Account IS NULL ORDER BY online DESC, level DESC LIMIT 1', [accountId])
  if (!c || c.account !== accountId) throw new ActionError('La cuenta no tiene ese personaje (el silencio se aplica a través de un personaje).', 404)
  return c
}

const muteUntil = (accountId: number) => queryAuthFirst<{ mutetime: number }>('SELECT mutetime FROM account WHERE id = ?', [accountId])
  .then(r => Number(r?.mutetime ?? 0)).catch(() => null)

export async function muteAccount(ctx: GmContext, accountId: number, durationKey: string, reasonRaw: string, characterGuid?: number) {
  if (!can(ctx.tier, 'mute')) throw new ActionError(DENIED, 403)
  const d = durationInfo(durationKey)
  if (!d || d.minutes < 0) throw new ActionError('Elegí una duración para el silencio (no puede ser permanente).')
  const reason = requireReason(reasonRaw)
  const target = await loadAccountTarget(ctx, accountId)
  const ch = await pickCharacter(accountId, characterGuid)

  const out = await soapMute(ch.name, d.minutes, reasonWithGm(ctx.user.username, reason))
  const until = await muteUntil(accountId)
  // Online players get mutetime = now + minutes; offline ones a negative value applied at next login.
  if (!out.ok || until === 0) {
    await gmLog(ctx, { action: 'MUTE', targetAccountId: accountId, targetCharacter: ch.name, reason, result: 'error', details: `Worldserver: ${coreMessage(out.output)}` })
    throw new ActionError(`El servidor no aplicó el silencio: ${coreMessage(out.output)}`, 502)
  }
  const ref = await recordSanction(ctx, { type: 'mute', accountId, accountName: target.username, characterGuid: ch.guid, characterName: ch.name, reason, durationKey, coreOutput: out.output })
  await gmLog(ctx, { action: 'MUTE', targetAccountId: accountId, targetCharacter: ch.name, reason, result: 'ok', reference: ref, details: `Silencio ${d.label} a ${target.username} (vía ${ch.name})${ch.online ? '' : ' — se aplica al conectarse'}` })
  return { username: target.username, character: ch.name, duration: d.label, pending: !ch.online }
}

export async function unmuteAccount(ctx: GmContext, accountId: number, characterGuid?: number) {
  if (!can(ctx.tier, 'mute')) throw new ActionError(DENIED, 403)
  const target = await loadAccountTarget(ctx, accountId)
  const ch = await pickCharacter(accountId, characterGuid)
  const out = await soapUnmute(ch.name)
  if (!out.ok) {
    await gmLog(ctx, { action: 'UNMUTE', targetAccountId: accountId, targetCharacter: ch.name, result: 'error', details: `Worldserver: ${coreMessage(out.output)}` })
    throw new ActionError(`El servidor no quitó el silencio: ${coreMessage(out.output)}`, 502)
  }
  await markRevoked(ctx, 'mute', accountId)
  await gmLog(ctx, { action: 'UNMUTE', targetAccountId: accountId, targetCharacter: ch.name, result: 'ok', details: `Silencio levantado a ${target.username}` })
  return { username: target.username }
}

// ── Character actions ───────────────────────────────────────────────────────

async function loadCharacterTarget(ctx: GmContext, guid: number) {
  const ch = await loadCharacter(guid)
  if (!ch) throw new ActionError('No encontramos ese personaje.', 404)
  const target = await loadAccountTarget(ctx, ch.account)
  return { ch, target }
}

export async function banCharacter(ctx: GmContext, guid: number, durationKey: string, reasonRaw: string) {
  const d = durationInfo(durationKey)
  if (!d) throw new ActionError('Duración inválida.')
  if (!can(ctx.tier, d.minutes < 0 ? 'banCharacterPerm' : 'banCharacterTemp')) {
    throw new ActionError(d.minutes < 0 ? 'Solo un GM nivel 3 puede banear personajes de forma permanente.' : DENIED, 403)
  }
  const reason = requireReason(reasonRaw)
  const { ch, target } = await loadCharacterTarget(ctx, guid)
  if (await activeCharacterBan(guid)) throw new ActionError(`${ch.name} ya tiene un baneo activo.`, 409)

  const out = await soapBanCharacter(ch.name, durationKey, reasonWithGm(ctx.user.username, reason))
  if (!out.ok || !(await activeCharacterBan(guid))) {
    await gmLog(ctx, { action: 'BAN_PERSONAJE', targetAccountId: ch.account, targetCharacter: ch.name, reason, result: 'error', details: `Worldserver: ${coreMessage(out.output)}` })
    throw new ActionError(`El servidor no aplicó la sanción: ${coreMessage(out.output)}`, 502)
  }
  const ref = await recordSanction(ctx, { type: 'ban_character', accountId: ch.account, accountName: target.username, characterGuid: guid, characterName: ch.name, reason, durationKey, coreOutput: out.output })
  await gmLog(ctx, { action: 'BAN_PERSONAJE', targetAccountId: ch.account, targetCharacter: ch.name, reason, result: 'ok', reference: ref, details: `Baneo del personaje ${ch.name} (${d.label})` })
  return { character: ch.name, duration: d.label }
}

export async function unbanCharacter(ctx: GmContext, guid: number) {
  const { ch } = await loadCharacterTarget(ctx, guid)
  if (!(await activeCharacterBan(guid))) throw new ActionError(`${ch.name} no tiene un baneo activo.`, 409)
  await assertCanRevoke(ctx, 'ban_character', ch.account, guid)
  const out = await soapUnbanCharacter(ch.name)
  if (!out.ok || (await activeCharacterBan(guid))) {
    await gmLog(ctx, { action: 'DESBAN_PERSONAJE', targetAccountId: ch.account, targetCharacter: ch.name, result: 'error', details: `Worldserver: ${coreMessage(out.output)}` })
    throw new ActionError(`El servidor no levantó la sanción: ${coreMessage(out.output)}`, 502)
  }
  await markRevoked(ctx, 'ban_character', ch.account, guid)
  await gmLog(ctx, { action: 'DESBAN_PERSONAJE', targetAccountId: ch.account, targetCharacter: ch.name, result: 'ok', details: `Sanción levantada al personaje ${ch.name}` })
  return { character: ch.name }
}

export async function kickCharacter(ctx: GmContext, guid: number, reasonRaw?: string) {
  if (!can(ctx.tier, 'kick')) throw new ActionError(DENIED, 403)
  const { ch } = await loadCharacterTarget(ctx, guid)
  if (!ch.online) throw new ActionError(`${ch.name} no está conectado: solo se puede expulsar a jugadores en línea.`, 409)
  const reason = sanitizeReason(reasonRaw ?? '') || 'Expulsado por un GM'
  const out = await soapKick(ch.name, reason)
  await gmLog(ctx, { action: 'KICK', targetAccountId: ch.account, targetCharacter: ch.name, reason, result: out.ok ? 'ok' : 'error', details: out.ok ? `${ch.name} expulsado` : `Worldserver: ${coreMessage(out.output)}` })
  if (!out.ok) throw new ActionError(`El servidor no expulsó al jugador: ${coreMessage(out.output)}`, 502)
  return { character: ch.name }
}

export async function unstuckCharacter(ctx: GmContext, guid: number, location: 'inn' | 'graveyard' | 'startzone') {
  if (!can(ctx.tier, 'unstuck')) throw new ActionError(DENIED, 403)
  const { ch } = await loadCharacterTarget(ctx, guid)
  const out = await soapUnstuck(ch.name, location)
  const where = { inn: 'su posada (piedra de hogar)', graveyard: 'el cementerio más cercano', startzone: 'su zona de inicio' }[location]
  await gmLog(ctx, { action: 'UNSTUCK', targetAccountId: ch.account, targetCharacter: ch.name, result: out.ok ? 'ok' : 'error', details: out.ok ? `${ch.name} enviado a ${where} (${ch.online ? 'en línea' : 'desconectado'})` : `Worldserver: ${coreMessage(out.output)}` })
  if (!out.ok) throw new ActionError(`El servidor no pudo desatascar al personaje: ${coreMessage(out.output)}`, 502)
  return { character: ch.name, where, online: !!ch.online }
}

/** Capital coordinates come from acore_world.game_tele, never hard-coded. */
export async function resolveCapital(key: string | undefined, race: number) {
  const capital = key ? CAPITALS.find(c => c.key === key) : defaultCapital(factionOf(race))
  if (!capital) throw new ActionError('Capital inválida.')
  const rows = await queryWorld<{ name: string; map: number; position_x: number; position_y: number; position_z: number }>(
    `SELECT name, map, position_x, position_y, position_z FROM game_tele WHERE name IN (${capital.tele.map(() => '?').join(',')})`,
    capital.tele
  ).catch(() => [])
  const row = capital.tele.map(t => rows.find(r => r.name.toLowerCase() === t.toLowerCase())).find(Boolean)
  if (!row) throw new ActionError(`No existe una ubicación para ${capital.label} en acore_world.game_tele.`, 422)
  return { capital, tele: row }
}

export async function teleportToCapital(ctx: GmContext, guid: number, capitalKey?: string) {
  if (!can(ctx.tier, 'teleport')) throw new ActionError(DENIED, 403)
  const { ch } = await loadCharacterTarget(ctx, guid)
  const { capital, tele } = await resolveCapital(capitalKey, ch.race)
  const out = await soapTeleName(ch.name, tele.name)
  const coords = `mapa ${tele.map} (${tele.position_x.toFixed(1)}, ${tele.position_y.toFixed(1)}, ${tele.position_z.toFixed(1)})`
  await gmLog(ctx, { action: 'TELEPORT', targetAccountId: ch.account, targetCharacter: ch.name, result: out.ok ? 'ok' : 'error', details: out.ok ? `${ch.name} → ${capital.label} [${tele.name}] ${coords}` : `Worldserver: ${coreMessage(out.output)}` })
  if (!out.ok) throw new ActionError(`El servidor no teletransportó al personaje: ${coreMessage(out.output)}`, 502)
  return { character: ch.name, capital: capital.label, coords, online: !!ch.online }
}

export { GM_TIER_SHORT }
