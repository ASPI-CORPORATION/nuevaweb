import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { tierFromGmLevel, tierFromRbacRank, resolveGmTier, can, GM_CAPS, SANCTION_DURATIONS, durationInfo } from '../lib/gm/permissions.ts'
import { CAPITALS, defaultCapital, factionOf, zoneName } from '../lib/gm/wow-data.ts'

describe('GM tier resolution (account_access + RBAC, never the JWT)', () => {
  test('gmlevel 0 → 0, 1 → 1, 2 → 2, ≥3 → 3', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 10].map(tierFromGmLevel), [0, 1, 2, 3, 3, 3])
  })
  test('RBAC ranks map to tiers', () => {
    assert.equal(tierFromRbacRank(90000), 1)
    assert.equal(tierFromRbacRank(90006), 1)
    for (const id of [90001, 90002, 90003]) assert.equal(tierFromRbacRank(id), 2)
    for (const id of [90004, 90005, 90007, 90008, 90009]) assert.equal(tierFromRbacRank(id), 3)
    assert.equal(tierFromRbacRank(null), 0)
    assert.equal(tierFromRbacRank(12345), 0)
  })
  test('highest source wins; Directivo → 3', () => {
    assert.equal(resolveGmTier({ gmlevel: 1, rbacRankId: 90002, isDirectivo: false }), 2)
    assert.equal(resolveGmTier({ gmlevel: 0, rbacRankId: null, isDirectivo: true }), 3)
    assert.equal(resolveGmTier({ gmlevel: 0, rbacRankId: null, isDirectivo: false }), 0)
  })
})

describe('Capability matrix', () => {
  test('players have no GM capability', () => {
    for (const cap of Object.keys(GM_CAPS)) assert.equal(can(0, cap), false, cap)
  })
  test('GM1 Soporte: tickets, unstuck, capital; no sanctions, no PII, no audit', () => {
    for (const cap of ['viewAccounts', 'viewCharacters', 'viewTickets', 'replyTickets', 'manageTickets', 'unstuck', 'teleport', 'serverStatus', 'onlinePlayers'])
      assert.ok(can(1, cap), cap)
    for (const cap of ['banAccountTemp', 'banCharacterTemp', 'mute', 'kick', 'unbanOwn', 'viewPiiMasked', 'auditPartial'])
      assert.ok(!can(1, cap), cap)
  })
  test('GM2 Moderador: temporary bans, mute, kick, own unbans, partial audit; no permanent', () => {
    for (const cap of ['banAccountTemp', 'banCharacterTemp', 'mute', 'kick', 'unbanOwn', 'viewPiiMasked', 'auditPartial']) assert.ok(can(2, cap), cap)
    for (const cap of ['banAccountPerm', 'banCharacterPerm', 'unbanAny', 'viewPiiFull', 'auditFull', 'staffSupervision', 'manageTemplates', 'reassignTickets'])
      assert.ok(!can(2, cap), cap)
  })
  test('GM3 Administrador: everything', () => {
    for (const cap of Object.keys(GM_CAPS)) assert.ok(can(3, cap), cap)
  })
})

describe('Sanction durations', () => {
  test('30m…30d plus permanent', () => {
    assert.deepEqual(SANCTION_DURATIONS.map(d => d.key), ['30m', '1h', '6h', '12h', '1d', '3d', '7d', '30d', 'perm'])
    assert.equal(durationInfo('6h').minutes, 360)
    assert.equal(durationInfo('perm').minutes, -1)
    assert.equal(durationInfo('1y'), null)
  })
})

describe('Capitals', () => {
  test('8 capitals, 4 per faction', () => {
    assert.equal(CAPITALS.length, 8)
    assert.equal(CAPITALS.filter(c => c.faction === 'Alianza').length, 4)
    assert.equal(CAPITALS.filter(c => c.faction === 'Horda').length, 4)
  })
  test('faction defaults: Ventormenta / Orgrimmar', () => {
    assert.equal(defaultCapital('Alianza').key, 'stormwind')
    assert.equal(defaultCapital('Horda').key, 'orgrimmar')
    assert.equal(defaultCapital(null), null)
  })
  test('race → faction (human Alianza, orc Horda, blood elf Horda, draenei Alianza)', () => {
    assert.equal(factionOf(1), 'Alianza'); assert.equal(factionOf(2), 'Horda')
    assert.equal(factionOf(10), 'Horda'); assert.equal(factionOf(11), 'Alianza')
  })
  test('unknown zones fall back to an id label', () => assert.match(zoneName(999999), /999999/))
})
