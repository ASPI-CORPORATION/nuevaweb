import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { LAUNCH, LAUNCH_AT, isLaunchPending, timeLeft } from '../lib/launch.ts'
import { SITE, REALMLIST_LINE, DISCORD_URL } from '../lib/site-config.ts'

describe('Fecha de lanzamiento', () => {
  test('viernes 13/11/2026 18:00 en Buenos Aires = 21:00 UTC', () => {
    assert.equal(new Date(LAUNCH_AT).toISOString(), '2026-11-13T21:00:00.000Z')
    const ar = new Intl.DateTimeFormat('es-AR', { timeZone: LAUNCH.timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(LAUNCH_AT)
    assert.match(ar, /viernes, 13 de noviembre de 2026.*18:00/)
  })
  test('el mismo instante para visitantes de cualquier país', () => {
    for (const tz of ['Europe/Madrid', 'America/Mexico_City', 'Asia/Tokyo', 'UTC']) {
      const local = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(LAUNCH_AT)
      assert.ok(local.length > 0, tz) // distinto texto local, mismo instante absoluto
    }
    assert.equal(Date.parse('2026-11-13T22:00:00+01:00'), LAUNCH_AT) // 18:00 ARG = 22:00 Madrid
  })
  test('pendiente antes, terminado después (sin tocar el reloj del sistema)', () => {
    assert.equal(isLaunchPending(LAUNCH_AT - 1), true)
    assert.equal(isLaunchPending(LAUNCH_AT), false)
    assert.equal(isLaunchPending(LAUNCH_AT + 1000), false)
  })
  test('cálculo de días/horas/minutos/segundos', () => {
    const t = timeLeft(LAUNCH_AT - ((1 * 86400 + 8 * 3600 + 35 * 60 + 42) * 1000))
    assert.deepEqual([t.days, t.hours, t.minutes, t.seconds], [1, 8, 35, 42])
  })
  test('nunca valores negativos', () => {
    const t = timeLeft(LAUNCH_AT + 5 * 86400000)
    assert.deepEqual([t.days, t.hours, t.minutes, t.seconds, t.totalMs], [0, 0, 0, 0, 0])
  })
})

describe('Enlaces oficiales', () => {
  test('realmlist oficial centralizado', () => {
    assert.equal(SITE.realmlist, 'logon.wowarg.com')
    assert.equal(REALMLIST_LINE, 'set realmlist logon.wowarg.com')
  })
  test('Discord oficial', () => assert.equal(DISCORD_URL, 'https://discord.gg/9KmrAPJzjn'))
})
