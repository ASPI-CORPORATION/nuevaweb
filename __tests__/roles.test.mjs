import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveRole, roleFromGmLevel, roleFromRbacRank, roleForMinGmLevel,
  hasRole, parseAccountIdList,
} from '../lib/roles.ts'
import { panelVisibility } from './helpers/panel-visibility.mjs'

const r = (gmlevel, rbacRankId = null, envDirectivo = false) => resolveRole({ gmlevel, rbacRankId, envDirectivo }).role

describe('Native AzerothCore gmlevel', () => {
  test('0 player, 1 moderator → user', () => { assert.equal(r(0), 'user'); assert.equal(r(1), 'user') })
  test('2 gamemaster → gm', () => assert.equal(r(2), 'gm'))
  test('3 administrator → admin (NOT directivo)', () => assert.equal(r(3), 'admin'))
  test('4 console → admin (NOT directivo)', () => assert.equal(r(4), 'admin'))
  test('legacy web gmlevel 10 → directivo', () => assert.equal(r(10), 'directivo'))
})

describe('Custom RBAC ranks', () => {
  test('Owner 90009 → directivo even with gmlevel 0', () => assert.equal(r(0, 90009), 'directivo'))
  test('Co-Owner 90008 → directivo', () => assert.equal(r(3, 90008), 'directivo'))
  test('Administrador 90007 → admin, never directivo', () => assert.equal(r(0, 90007), 'admin'))
  test('Developer / Head GM / GM → gm', () => {
    for (const id of [90002, 90003, 90004, 90005, 90006]) assert.equal(r(0, id), 'gm', String(id))
  })
  test('Ayudante / Moderador → user', () => { assert.equal(r(0, 90000), 'user'); assert.equal(r(0, 90001), 'user') })
  test('unknown permission ids are ignored', () => { assert.equal(roleFromRbacRank(12345), 'user'); assert.equal(roleFromRbacRank(90010), 'user') })
})

describe('Owner account after RBAC migration (regression for lost /directivos)', () => {
  test('gmlevel lowered to native 3 + Owner rank → still directivo', () => assert.equal(r(3, 90009), 'directivo'))
  test('gmlevel 3 without rank → admin only (needs RBAC rank or env to be directivo)', () => assert.equal(r(3), 'admin'))
  test('env break-glass grants directivo', () => assert.equal(r(0, null, true), 'directivo'))
  test('highest source wins and sources are reported', () => {
    const a = resolveRole({ gmlevel: 2, rbacRankId: 90009, envDirectivo: false })
    assert.equal(a.role, 'directivo')
    assert.deepEqual(a.sources, ['gmlevel', 'rbac'])
  })
})

describe('Privilege separation', () => {
  test('GMs and admins never reach directivo', () => {
    for (const g of [0, 1, 2, 3, 4, 5, 9]) for (const rank of [null, 90000, 90002, 90005, 90007]) {
      assert.notEqual(r(g, rank), 'directivo', `gmlevel=${g} rank=${rank}`)
    }
  })
  test('hasRole hierarchy', () => {
    assert.ok(hasRole('directivo', 'admin'))
    assert.ok(hasRole('admin', 'gm'))
    assert.ok(!hasRole('admin', 'directivo'))
    assert.ok(!hasRole('gm', 'admin'))
    assert.ok(!hasRole('user', 'gm'))
    assert.ok(!hasRole(null, 'user'))
  })
  test('legacy numeric thresholds map to roles', () => {
    assert.equal(roleForMinGmLevel(2), 'gm')
    assert.equal(roleForMinGmLevel(3), 'admin')
    assert.equal(roleForMinGmLevel(10), 'directivo')
    assert.equal(roleFromGmLevel(9), 'admin')
  })
})

describe('Navigation by role', () => {
  test('user sees only Mi Cuenta', () => assert.deepEqual(panelVisibility('user'), ['/cuenta']))
  test('gm sees cuenta + gm', () => assert.deepEqual(panelVisibility('gm'), ['/cuenta', '/gm']))
  test('admin does not see /directivos', () => assert.deepEqual(panelVisibility('admin'), ['/cuenta', '/gm', '/admin']))
  test('directivo sees every panel', () => assert.deepEqual(panelVisibility('directivo'), ['/cuenta', '/gm', '/admin', '/directivos']))
})

describe('DIRECTIVOS_ACCOUNT_IDS parsing', () => {
  test('parses valid ids, ignores junk', () => {
    assert.deepEqual([...parseAccountIdList(' 1, 25 ,abc,-3,0,2.5,,7')], [1, 25, 7])
    assert.equal(parseAccountIdList(undefined).size, 0)
    assert.equal(parseAccountIdList('').size, 0)
  })
})
