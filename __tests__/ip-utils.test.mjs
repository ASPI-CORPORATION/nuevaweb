/**
 * Tests for lib/ip-utils — IP normalization for AzerothCore VARCHAR(15) columns.
 *
 * Run with:  node --test __tests__/ip-utils.test.mjs
 *
 * Uses the Node.js built-in test runner (Node 18+). No extra dependencies needed.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// ── Import the functions under test ──────────────────────────────────────────
// Because lib/ip-utils.ts is TypeScript we import the compiled output via ts-node,
// OR we duplicate the logic here. Since there is no ts-node in devDeps we
// inline the pure-JS equivalents — these must stay in sync with lib/ip-utils.ts.

function isIPv4(ip) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)
}

function isIPv6(ip) {
  return ip.includes(':')
}

function extractIPv4FromMapped(ip) {
  const m = ip.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
  return m ? m[1] : null
}

function normalizeIP(raw) {
  const trimmed = raw.trim()
  const mapped = extractIPv4FromMapped(trimmed)
  if (mapped) {
    return { normalizedIp: mapped, acoreIp: mapped, isIPv6: false }
  }
  if (isIPv4(trimmed)) {
    return { normalizedIp: trimmed, acoreIp: trimmed, isIPv6: false }
  }
  const isV6 = isIPv6(trimmed)
  return {
    normalizedIp: trimmed || 'unknown',
    acoreIp: '127.0.0.1',
    isIPv6: isV6,
  }
}

function getClientIP(headers) {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}

// ── Helper to build a minimal headers-like object ────────────────────────────
function makeHeaders(map) {
  return { get: (name) => map[name.toLowerCase()] ?? null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeIP
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeIP — pure IPv4', () => {
  const cases = [
    '192.168.1.1',
    '10.0.0.1',
    '255.255.255.255',
    '1.2.3.4',
  ]
  for (const ip of cases) {
    test(ip, () => {
      const r = normalizeIP(ip)
      assert.equal(r.normalizedIp, ip)
      assert.equal(r.acoreIp, ip)
      assert.equal(r.isIPv6, false)
      assert.ok(r.acoreIp.length <= 15, `acoreIp "${r.acoreIp}" exceeds VARCHAR(15)`)
    })
  }
})

describe('normalizeIP — IPv4-mapped IPv6 (Node.js / nginx common form)', () => {
  const cases = [
    { input: '::ffff:192.168.1.1',    expected: '192.168.1.1' },
    { input: '::ffff:10.0.0.1',       expected: '10.0.0.1'    },
    { input: '::FFFF:1.2.3.4',        expected: '1.2.3.4'     },
    { input: '::192.168.1.1',         expected: '192.168.1.1' },
  ]
  for (const { input, expected } of cases) {
    test(`${input} → ${expected}`, () => {
      const r = normalizeIP(input)
      assert.equal(r.normalizedIp, expected)
      assert.equal(r.acoreIp, expected)
      assert.equal(r.isIPv6, false)
      assert.ok(r.acoreIp.length <= 15, `acoreIp "${r.acoreIp}" exceeds VARCHAR(15)`)
    })
  }
})

describe('normalizeIP — pure IPv6 → acoreIp must be "127.0.0.1"', () => {
  const cases = [
    '2001:db8:85a3::8a2e:370:7334',
    '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    'fe80::1',
    '::1',
    '2800:810:4c3:1a2:5df:b153:9e4d:dd3c',
  ]
  for (const ip of cases) {
    test(ip, () => {
      const r = normalizeIP(ip)
      assert.equal(r.normalizedIp, ip)
      assert.equal(r.acoreIp, '127.0.0.1', `IPv6 must map to 127.0.0.1 for VARCHAR(15)`)
      assert.equal(r.isIPv6, true)
      assert.ok(r.acoreIp.length <= 15, `acoreIp "${r.acoreIp}" exceeds VARCHAR(15)`)
    })
  }
})

describe('normalizeIP — edge cases', () => {
  test('empty string', () => {
    const r = normalizeIP('')
    assert.equal(r.acoreIp, '127.0.0.1')
    assert.ok(r.acoreIp.length <= 15)
  })

  test('"unknown" string', () => {
    const r = normalizeIP('unknown')
    assert.equal(r.acoreIp, '127.0.0.1')
    assert.ok(r.acoreIp.length <= 15)
  })

  test('whitespace trimmed', () => {
    const r = normalizeIP('  192.168.1.1  ')
    assert.equal(r.acoreIp, '192.168.1.1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// VARCHAR(15) contract — ALL acoreIp values must fit
// ═══════════════════════════════════════════════════════════════════════════════

describe('acoreIp VARCHAR(15) contract', () => {
  const allInputs = [
    '192.168.0.1',
    '::ffff:10.20.30.40',
    '2001:db8::1',
    '::1',
    'fe80::dead:beef',
    '',
    'unknown',
    '255.255.255.255',
  ]

  for (const ip of allInputs) {
    test(`"${ip || '(empty)'}" → acoreIp ≤ 15 chars`, () => {
      const { acoreIp } = normalizeIP(ip)
      assert.ok(
        acoreIp.length <= 15,
        `acoreIp "${acoreIp}" is ${acoreIp.length} chars — exceeds VARCHAR(15)`
      )
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// getClientIP
// ═══════════════════════════════════════════════════════════════════════════════

describe('getClientIP', () => {
  test('x-forwarded-for single value', () => {
    const h = makeHeaders({ 'x-forwarded-for': '1.2.3.4' })
    assert.equal(getClientIP(h), '1.2.3.4')
  })

  test('x-forwarded-for list takes first (leftmost = client)', () => {
    const h = makeHeaders({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 172.16.0.1' })
    assert.equal(getClientIP(h), '1.2.3.4')
  })

  test('x-forwarded-for IPv6', () => {
    const h = makeHeaders({ 'x-forwarded-for': '2001:db8::1, 10.0.0.1' })
    assert.equal(getClientIP(h), '2001:db8::1')
  })

  test('falls back to x-real-ip', () => {
    const h = makeHeaders({ 'x-real-ip': '5.6.7.8' })
    assert.equal(getClientIP(h), '5.6.7.8')
  })

  test('returns "unknown" when both headers absent', () => {
    const h = makeHeaders({})
    assert.equal(getClientIP(h), 'unknown')
  })

  test('x-forwarded-for IPv4-mapped IPv6', () => {
    const h = makeHeaders({ 'x-forwarded-for': '::ffff:192.168.1.1' })
    // getClientIP returns the raw string; normalizeIP unwraps it downstream
    assert.equal(getClientIP(h), '::ffff:192.168.1.1')
    const { acoreIp } = normalizeIP(getClientIP(h))
    assert.equal(acoreIp, '192.168.1.1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Simulated register flow
// ═══════════════════════════════════════════════════════════════════════════════

describe('Simulated register flow', () => {
  test('IPv4 client — acoreIp = real IP, isIPv6 = false', () => {
    const rawIp = getClientIP(makeHeaders({ 'x-forwarded-for': '203.0.113.42' }))
    const { normalizedIp, acoreIp, isIPv6 } = normalizeIP(rawIp)
    assert.equal(normalizedIp, '203.0.113.42')
    assert.equal(acoreIp, '203.0.113.42')
    assert.equal(isIPv6, false)
    // last_ip INSERT would use: acoreIp = '203.0.113.42'
    // cms_logs INSERT would use: normalizedIp = '203.0.113.42'
  })

  test('IPv6 client — acoreIp = 127.0.0.1, real IP in logs', () => {
    const rawIp = getClientIP(makeHeaders({ 'x-forwarded-for': '2800:810:4c3:1a2:5df:b153:9e4d:dd3c' }))
    const { normalizedIp, acoreIp, isIPv6 } = normalizeIP(rawIp)
    assert.equal(normalizedIp, '2800:810:4c3:1a2:5df:b153:9e4d:dd3c')
    assert.equal(acoreIp, '127.0.0.1')   // safe for VARCHAR(15)
    assert.equal(isIPv6, true)
    assert.ok(acoreIp.length <= 15)
    // last_ip INSERT would use: acoreIp = '127.0.0.1'
    // cms_logs INSERT would use: normalizedIp (full IPv6)
  })

  test('IPv4-mapped IPv6 (common with Node.js dual-stack) — treated as IPv4', () => {
    const rawIp = getClientIP(makeHeaders({ 'x-forwarded-for': '::ffff:200.1.2.3' }))
    const { normalizedIp, acoreIp, isIPv6 } = normalizeIP(rawIp)
    assert.equal(normalizedIp, '200.1.2.3')
    assert.equal(acoreIp, '200.1.2.3')
    assert.equal(isIPv6, false)
    assert.ok(acoreIp.length <= 15)
  })
})
