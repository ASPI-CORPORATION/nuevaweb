import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, isSafeImageUrl, isUploadUrl, NEWS_CATEGORIES } from '../lib/content-config.ts'

// lib/sanitize.ts and lib/uploads.ts use the '@/' alias, so they are covered by the
// HTTP integration tests; here we test the pure helpers they rely on.

describe('slugify', () => {
  test('transliterates Spanish characters', () => assert.equal(slugify('¡Llegó la Actualización del Ñandú!'), 'llego-la-actualizacion-del-nandu'))
  test('collapses separators and trims', () => assert.equal(slugify('  Parche   3.3.5 -- Notas  '), 'parche-3-3-5-notas'))
  test('limits length', () => assert.ok(slugify('a'.repeat(300)).length <= 120))
})

describe('image URL policy', () => {
  test('accepts own uploads', () => assert.ok(isSafeImageUrl('/api/uploads/2b71cf05-5e69-47b3-9b45-11ee55e70e9a.png')))
  test('accepts https', () => assert.ok(isSafeImageUrl('https://cdn.example.com/a.jpg')))
  test('rejects http, javascript:, data:, protocol-relative and traversal', () => {
    for (const u of ['http://x.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAA', '//evil.com/a.png', '/api/uploads/../../.env', '/api/uploads/x.svg']) {
      assert.equal(isSafeImageUrl(u), false, u)
    }
  })
  test('isUploadUrl only matches generated names', () => {
    assert.ok(!isUploadUrl('/api/uploads/foto.png'))
    assert.ok(isUploadUrl('/api/uploads/00000000-0000-0000-0000-000000000000.webp'))
  })
})

describe('news categories', () => {
  test('match cms_news.category ENUM exactly', () => {
    assert.deepEqual([...NEWS_CATEGORIES].sort(), ['Actualizaciones', 'Eventos', 'General', 'Mantenimiento', 'PvE', 'PvP'])
  })
})
