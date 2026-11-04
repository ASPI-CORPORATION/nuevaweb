/**
 * Cliente SOAP para AzerothCore WorldServer
 * AzerothCore usa SOAP en puerto 7878 por defecto
 * Protocolo: SOAP 1.1 con Basic Auth
 */

import { queryCms } from './db'

const SOAP_HOST = process.env.SOAP_HOST || '127.0.0.1'
const SOAP_PORT = process.env.SOAP_PORT || '7878'
const SOAP_USER = process.env.SOAP_USER || ''
const SOAP_PASS = process.env.SOAP_PASS || ''

const SOAP_URL = `http://${SOAP_HOST}:${SOAP_PORT}/`

function buildSoapEnvelope(command: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:AC">
  <SOAP-ENV:Body>
    <ns1:executeCommand>
      <command>${escapeXml(command)}</command>
    </ns1:executeCommand>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function parseSOAPResponse(xml: string): string {
  const match = xml.match(/<result>([\s\S]*?)<\/result>/)
  return match ? match[1].trim() : xml
}

export async function soapCommand(command: string): Promise<{ success: boolean; result: string }> {
  try {
    const auth = Buffer.from(`${SOAP_USER}:${SOAP_PASS}`).toString('base64')
    const body = buildSoapEnvelope(command)

    const response = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'urn:AC#executeCommand',
        'Authorization': `Basic ${auth}`,
      },
      body,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return { success: false, result: `HTTP ${response.status}` }
    }

    const xml = await response.text()
    const result = parseSOAPResponse(xml)
    return { success: true, result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error SOAP desconocido'
    return { success: false, result: msg }
  }
}

// Comandos específicos de AzerothCore

export async function sendMailInGame(
  characterName: string,
  subject: string,
  body: string,
  itemEntry?: number,
  itemCount?: number
): Promise<{ success: boolean; result: string }> {
  let cmd = `.send mail "${characterName}" "${subject}" "${body}"`
  if (itemEntry) {
    cmd = `.send items "${characterName}" "${subject}" "${body}" ${itemEntry}:${itemCount ?? 1}`
  }
  return soapCommand(cmd)
}

export async function banAccount(
  accountName: string,
  duration: string, // "0" = permanente, "1d", "7d", etc.
  reason: string,
  bannedBy: string
): Promise<{ success: boolean; result: string }> {
  const cmd = `.ban account ${accountName} ${duration} ${reason}`
  return soapCommand(cmd)
}

export async function unbanAccount(accountName: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.unban account ${accountName}`)
}

export async function banIP(ip: string, duration: string, reason: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.ban ip ${ip} ${duration} ${reason}`)
}

export async function kickPlayer(characterName: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.kick ${characterName}`)
}

export async function mutePlayer(characterName: string, minutes: number, reason: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.mute ${characterName} ${minutes} ${reason}`)
}

export async function unmutePlayer(characterName: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.unmute ${characterName}`)
}

export async function revivePlayer(characterName: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.revive ${characterName}`)
}

export async function teleportPlayer(characterName: string, mapId: number, x: number, y: number, z: number): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.go creature ${characterName}`)
}

export async function unstuckPlayer(characterName: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.character unstuck ${characterName}`)
}

export async function sendAnnounce(message: string): Promise<{ success: boolean; result: string }> {
  return soapCommand(`.announce ${message}`)
}

export async function addCoins(characterName: string, amount: number, reason: string): Promise<{ success: boolean; result: string }> {
  // Enviamos por mail la moneda como item especial, o usamos la DB directamente
  // Para Moneda Argentina usamos la DB cms_user_coins + mail de notificación
  return { success: true, result: 'coins_via_db' }
}

export async function getServerStatus(): Promise<{ online: boolean; players: number; uptime: string }> {
  const result = await soapCommand('.server info')
  if (!result.success) return { online: false, players: 0, uptime: '0' }

  const playersMatch = result.result.match(/(\d+) players online/)
  const players = playersMatch ? parseInt(playersMatch[1]) : 0

  return { online: true, players, uptime: result.result }
}

export async function reloadConfig(): Promise<{ success: boolean; result: string }> {
  return soapCommand('.reload config')
}
