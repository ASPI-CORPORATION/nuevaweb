import { soapCommand } from '@/lib/soap'
import { durationInfo } from '@/lib/gm/permissions'

/**
 * Safe builders for the AzerothCore console commands used by the GM panel.
 * Commands are sent through the worldserver SOAP interface (never through SQL),
 * so the core applies its own logic: kicking banned players, muting sessions, etc.
 *
 *   .ban account $name $bantime $reason      (bantime: "-1" permanent, or "4d20h3s")
 *   .unban account $name
 *   .ban character $name $bantime $reason
 *   .unban character $name
 *   .mute $character $minutes $reason        /  .unmute $character
 *   .kick $character $reason
 *   .unstuck $character inn|graveyard|startzone
 *   .tele name $character $game_tele_name
 */

export interface SoapOutcome { ok: boolean; output: string }

const ACCOUNT_RE = /^[A-Za-z0-9_]{1,32}$/
const CHARACTER_RE = /^\p{L}{2,12}$/u
const TELE_RE = /^[A-Za-z0-9_]{2,100}$/

export function isValidAccountName(name: string) { return ACCOUNT_RE.test(name) }
export function isValidCharacterName(name: string) { return CHARACTER_RE.test(name) }

/** Reasons are the last argument of each command: strip anything that could start a new line/command. */
export function sanitizeReason(reason: string, max = 200): string {
  return reason
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** "[GM Nombre] motivo": the SOAP account appears as bannedby, so the real GM is kept in the reason. */
export function reasonWithGm(gmName: string, reason: string) {
  return sanitizeReason(`[GM ${gmName}] ${reason}`)
}

export function acBanTime(durationKey: string): string | null {
  const d = durationInfo(durationKey)
  if (!d) return null
  return d.minutes < 0 ? '-1' : durationKey
}

async function run(command: string): Promise<SoapOutcome> {
  const r = await soapCommand(command)
  return { ok: r.success, output: r.result }
}

function guardAccount(name: string) {
  if (!isValidAccountName(name)) throw new Error('Nombre de cuenta inválido para el comando del servidor.')
}
function guardCharacter(name: string) {
  if (!isValidCharacterName(name)) throw new Error('Nombre de personaje inválido para el comando del servidor.')
}

export async function soapBanAccount(account: string, durationKey: string, reason: string) {
  guardAccount(account)
  const t = acBanTime(durationKey)
  if (!t) throw new Error('Duración inválida.')
  return run(`.ban account ${account} ${t} ${sanitizeReason(reason)}`)
}

export async function soapUnbanAccount(account: string) {
  guardAccount(account)
  return run(`.unban account ${account}`)
}

export async function soapBanCharacter(character: string, durationKey: string, reason: string) {
  guardCharacter(character)
  const t = acBanTime(durationKey)
  if (!t) throw new Error('Duración inválida.')
  return run(`.ban character ${character} ${t} ${sanitizeReason(reason)}`)
}

export async function soapUnbanCharacter(character: string) {
  guardCharacter(character)
  return run(`.unban character ${character}`)
}

export async function soapMute(character: string, minutes: number, reason: string) {
  guardCharacter(character)
  if (!Number.isInteger(minutes) || minutes <= 0) throw new Error('Duración de silencio inválida.')
  return run(`.mute ${character} ${minutes} ${sanitizeReason(reason)}`)
}

export async function soapUnmute(character: string) {
  guardCharacter(character)
  return run(`.unmute ${character}`)
}

export async function soapKick(character: string, reason: string) {
  guardCharacter(character)
  return run(`.kick ${character} ${sanitizeReason(reason)}`)
}

export async function soapUnstuck(character: string, location: 'inn' | 'graveyard' | 'startzone') {
  guardCharacter(character)
  return run(`.unstuck ${character} ${location}`)
}

export async function soapTeleName(character: string, teleName: string) {
  guardCharacter(character)
  if (!TELE_RE.test(teleName)) throw new Error('Ubicación inválida.')
  return run(`.tele name ${character} ${teleName}`)
}

export async function soapServerInfo() {
  return run('.server info')
}
