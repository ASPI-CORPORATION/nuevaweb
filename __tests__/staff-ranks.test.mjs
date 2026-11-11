import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { STAFF_RANKS, rankByKey, rankByRbac, suspensionState } from '../lib/staff/ranks.ts'
import { tierFromRbacRank, tierFromGmLevel } from '../lib/gm/permissions.ts'

describe('Staff rank map', () => {
  test('10 ranks in the visual order, RBAC 90000–90009', () => {
    assert.deepEqual(STAFF_RANKS.map(r => r.name), ['Ayudante', 'Moderador', 'Game Master', 'GM Senior', 'Supervisor GM', 'Head GM', 'Developer', 'Administrador', 'Co-Owner', 'Owner'])
    assert.deepEqual(STAFF_RANKS.map(r => r.rbacId), [90000, 90001, 90002, 90003, 90004, 90005, 90006, 90007, 90008, 90009])
  })
  test('gmlevel written by each rank equals its GM panel tier (no drift)', () => {
    for (const r of STAFF_RANKS) assert.equal(tierFromGmLevel(r.gmlevel), tierFromRbacRank(r.rbacId), r.name)
  })
  test('only Co-Owner and Owner are Propietario-only; Administrador+ need typed confirmation', () => {
    assert.deepEqual(STAFF_RANKS.filter(r => r.ownerOnly).map(r => r.key), ['co_owner', 'owner'])
    assert.deepEqual(STAFF_RANKS.filter(r => r.elevated).map(r => r.key), ['administrador', 'co_owner', 'owner'])
  })
  test('lookups', () => {
    assert.equal(rankByKey('gm_senior').rbacId, 90003)
    assert.equal(rankByRbac(90006).key, 'developer')
    assert.equal(rankByKey('nope'), null)
    assert.equal(rankByRbac(12345), null)
  })
})

describe('Suspension state (never auto-restores, only reports)', () => {
  const now = Date.parse('2026-11-11T12:00:00Z')
  const s = (a, b, status = 'vigente') => suspensionState({ status, starts_at: a, ends_at: b }, now)
  test('programada / vigente / finalizada / levantada', () => {
    assert.equal(s('2026-11-12T00:00:00Z', '2026-11-13T00:00:00Z'), 'programada')
    assert.equal(s('2026-11-10T00:00:00Z', '2026-11-13T00:00:00Z'), 'vigente')
    assert.equal(s('2026-11-09T00:00:00Z', '2026-11-10T00:00:00Z'), 'finalizada')
    assert.equal(s('2026-11-10T00:00:00Z', '2026-11-13T00:00:00Z', 'levantada'), 'levantada')
  })
})
