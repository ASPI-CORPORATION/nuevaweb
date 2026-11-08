import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveRole, roleFromGmLevel, roleFromRbacRank, roleForMinGmLevel, hasRole, isOwner, OWNER_ACCOUNT_ID,
} from '../lib/roles.ts'
import { panelVisibility } from './helpers/panel-visibility.mjs'

const OWNER = { rank: 'propietario', name: 'Máxima Autoridad' }
const DIR = { rank: 'directivo', name: 'Administrador General' }
const r = (gmlevel, rbacRankId = null, directivo = null) => resolveRole({ gmlevel, rbacRankId, directivo }).role

describe('Directivo comes only from wowargentina_directivos', () => {
  test('active Propietario row → directivo, even with gmlevel 0', () => assert.equal(r(0, null, OWNER), 'directivo'))
  test('active Directivo row → directivo', () => assert.equal(r(0, null, DIR), 'directivo'))
  test('legacy gmlevel 10 without a row → NOT directivo (admin)', () => assert.equal(r(10), 'admin'))
  test('RBAC Owner 90009 without a row → NOT directivo (admin)', () => assert.equal(r(0, 90009), 'admin'))
  test('RBAC Co-Owner 90008 without a row → NOT directivo', () => assert.equal(r(3, 90008), 'admin'))
  test('membership does not touch in-game gmlevel', () => {
    const a = resolveRole({ gmlevel: 0, rbacRankId: null, directivo: DIR })
    assert.equal(a.gmlevel, 0)
    assert.deepEqual(a.sources, ['directivos'])
  })
  test('isOwner only for propietario rank', () => {
    assert.ok(isOwner({ directivo: OWNER }))
    assert.ok(!isOwner({ directivo: DIR }))
    assert.ok(!isOwner({ directivo: null }))
    assert.ok(!isOwner(null))
  })
  test('owner account id is 1', () => assert.equal(OWNER_ACCOUNT_ID, 1))
})

describe('GM / Admin still come from the game permissions', () => {
  test('0 player, 1 moderator → user', () => { assert.equal(r(0), 'user'); assert.equal(r(1), 'user') })
  test('2 → gm, 3 → admin, 4 console → admin', () => { assert.equal(r(2), 'gm'); assert.equal(r(3), 'admin'); assert.equal(r(4), 'admin') })
  test('RBAC Administrador → admin', () => assert.equal(r(0, 90007), 'admin'))
  test('RBAC Game Master..Developer → gm', () => { for (const id of [90002, 90003, 90004, 90005, 90006]) assert.equal(r(0, id), 'gm') })
  test('RBAC Ayudante / Moderador → user', () => { assert.equal(r(0, 90000), 'user'); assert.equal(r(0, 90001), 'user') })
  test('unknown permission ids ignored', () => { assert.equal(roleFromRbacRank(12345), 'user'); assert.equal(roleFromRbacRank(90010), 'user') })
})

describe('Privilege separation', () => {
  test('no gmlevel / RBAC combination reaches directivo', () => {
    for (const g of [0, 1, 2, 3, 4, 9, 10, 255]) for (const rank of [null, 90000, 90005, 90007, 90008, 90009]) {
      assert.notEqual(r(g, rank), 'directivo', `gmlevel=${g} rank=${rank}`)
    }
  })
  test('hasRole hierarchy', () => {
    assert.ok(hasRole('directivo', 'admin'))
    assert.ok(hasRole('admin', 'gm'))
    assert.ok(!hasRole('admin', 'directivo'))
    assert.ok(!hasRole('gm', 'admin'))
    assert.ok(!hasRole(null, 'user'))
  })
  test('legacy numeric thresholds map to roles', () => {
    assert.equal(roleForMinGmLevel(2), 'gm')
    assert.equal(roleForMinGmLevel(3), 'admin')
    assert.equal(roleForMinGmLevel(10), 'directivo')
    assert.equal(roleFromGmLevel(10), 'admin')
  })
})

describe('Navigation by role', () => {
  test('user sees only Mi Cuenta', () => assert.deepEqual(panelVisibility('user'), ['/cuenta']))
  test('gm sees cuenta + gm', () => assert.deepEqual(panelVisibility('gm'), ['/cuenta', '/gm']))
  test('admin does not see /directivos', () => assert.deepEqual(panelVisibility('admin'), ['/cuenta', '/gm', '/admin']))
  test('directivo sees every panel', () => assert.deepEqual(panelVisibility('directivo'), ['/cuenta', '/gm', '/admin', '/directivos']))
})
