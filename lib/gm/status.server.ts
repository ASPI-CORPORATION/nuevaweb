import net from 'node:net'
import { queryCharacters, queryCms, executeCms } from '@/lib/db'
import { soapServerInfo } from '@/lib/gm/soap-commands'

function tcpCheck(host: string, port: number, timeoutMs = 2000): Promise<{ up: boolean; ms: number | null }> {
  return new Promise(resolve => {
    const started = Date.now()
    const socket = net.createConnection({ host, port })
    const done = (up: boolean) => {
      socket.destroy()
      resolve({ up, ms: up ? Date.now() - started : null })
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

export interface ServerStatus {
  authserver: { online: boolean; latencyMs: number | null; endpoint: string }
  worldserver: {
    online: boolean
    soap: boolean
    portOpen: boolean | null
    connectedPlayers: number | null
    uptime: string | null
    revision: string | null
  }
  checkedAt: string
}

let cached: { at: number; data: ServerStatus } | null = null

/**
 * Real process checks: TCP to the authserver port and a `.server info` round trip through
 * the worldserver SOAP interface. A working MySQL connection is NOT taken as proof that
 * the worldserver runs.
 */
export async function getServerStatus(): Promise<ServerStatus> {
  if (cached && Date.now() - cached.at < 15_000) return cached.data
  const authHost = process.env.AUTH_HOST || process.env.SOAP_HOST || '127.0.0.1'
  const authPort = Number(process.env.AUTH_PORT || 3724)
  const worldHost = process.env.WORLD_HOST || process.env.SOAP_HOST || '127.0.0.1'
  const worldPort = process.env.WORLD_PORT ? Number(process.env.WORLD_PORT) : null

  const [auth, soap, worldTcp] = await Promise.all([
    tcpCheck(authHost, authPort),
    soapServerInfo().catch(() => ({ ok: false, output: '' })),
    worldPort ? tcpCheck(worldHost, worldPort) : Promise.resolve(null),
  ])

  const out = soap.ok ? soap.output : ''
  const players = out.match(/Connected players:\s*(\d+)/i)?.[1] ?? out.match(/(\d+) players online/i)?.[1]
  const data: ServerStatus = {
    authserver: { online: auth.up, latencyMs: auth.ms, endpoint: `${authHost}:${authPort}` },
    worldserver: {
      online: soap.ok,
      soap: soap.ok,
      portOpen: worldTcp ? worldTcp.up : null,
      connectedPlayers: players != null ? Number(players) : null,
      uptime: out.match(/(?:Server uptime|Uptime):\s*([^\n\r]+)/i)?.[1]?.trim() ?? null,
      revision: out.match(/(AzerothCore rev\.[^\n\r]*)/i)?.[1]?.trim() ?? null,
    },
    checkedAt: new Date().toISOString(),
  }
  cached = { at: Date.now(), data }
  return data
}

export async function onlineCountFromDb(): Promise<number> {
  const r = await queryCharacters<{ c: number }>('SELECT COUNT(*) AS c FROM characters WHERE online = 1')
  return Number(r[0]?.c ?? 0)
}

/** One row every 5 minutes at most; the online-players chart only has data from installation onward. */
export async function recordOnlineSnapshot(players: number, source: 'soap' | 'db') {
  try {
    const last = await queryCms<{ recent: number }>(
      'SELECT COUNT(*) AS recent FROM cms_online_snapshots WHERE taken_at > NOW() - INTERVAL 5 MINUTE'
    )
    if (Number(last[0]?.recent ?? 0) === 0) {
      await executeCms('INSERT INTO cms_online_snapshots (players, source) VALUES (?, ?)', [players, source])
    }
  } catch {}
}
