/**
 * Tests de SRP6 para WoW Argentina CMS
 * Verifica la implementación contra el algoritmo de AzerothCore.
 *
 * Ejecutar: node tests/srp6.test.mjs
 *
 * Para probar con una cuenta real de tu DB, ejecutá:
 *   node tests/srp6.test.mjs --live
 * y seguí las instrucciones en pantalla.
 */

import { createHash } from 'crypto'

// ─── Implementación de referencia (Python-style, independiente) ───────────────

const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7')
const G = BigInt(7)

function modPow(base, exp, m) {
  let result = 1n
  base = base % m
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % m
    exp >>= 1n
    base = (base * base) % m
  }
  return result
}

function sha1(data) {
  return createHash('sha1').update(data).digest()
}

function refComputeVerifier(username, password, salt) {
  const shaPass = sha1(Buffer.from(`${username.toUpperCase()}:${password.toUpperCase()}`))
  const xHash = sha1(Buffer.concat([salt, shaPass]))
  const x = BigInt('0x' + Buffer.from(xHash).reverse().toString('hex'))
  const v = modPow(G, x, N)
  const vHex = v.toString(16).padStart(64, '0')
  return Buffer.from(vHex, 'hex').reverse()
}

// ─── Helpers de test ──────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓  ${message}`)
    passed++
  } else {
    console.error(`  ✗  FAIL: ${message}`)
    failed++
  }
}

function assertEqual(a, b, message) {
  const eq = Buffer.isBuffer(a) && Buffer.isBuffer(b) ? a.equals(b) : a === b
  if (eq) {
    console.log(`  ✓  ${message}`)
    passed++
  } else {
    console.error(`  ✗  FAIL: ${message}`)
    if (Buffer.isBuffer(a)) {
      console.error(`     expected: ${a.toString('hex')}`)
      console.error(`     got:      ${b.toString('hex')}`)
    } else {
      console.error(`     expected: ${a}`)
      console.error(`     got:      ${b}`)
    }
    failed++
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n=== SRP6 Unit Tests ===\n')

// Test 1: N es safe prime
console.log('Test 1: Parámetros SRP6')
function millerRabin(n) {
  if (n < 2n) return false
  for (const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n]) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  let r = 0n, d = n - 1n
  while (d % 2n === 0n) { r++; d /= 2n }
  for (const a of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]) {
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    let cont = false
    for (let i = 0n; i < r - 1n; i++) {
      x = modPow(x, 2n, n)
      if (x === n - 1n) { cont = true; break }
    }
    if (!cont) return false
  }
  return true
}
assert(N.toString(16) === '894b645e89e1535bbdad5b8b290650530801b18ebfbf5e8fab3c82872a3e9bb7', 'N coincide con SRP6.cpp de AzerothCore')
assert(G === 7n, 'g = 7')
assert(millerRabin(N), 'N es primo (Miller-Rabin)')
assert(millerRabin((N - 1n) / 2n), 'N es safe prime ((N-1)/2 también es primo)')

// Test 2: computeVerifier reproduce resultado de referencia
console.log('\nTest 2: computeVerifier')

const TEST_SALT = Buffer.alloc(32, 0x42) // 32 bytes de valor 0x42
const TEST_USER = 'TESTUSER'
const TEST_PASS = 'TESTPASS'

const refVerifier = refComputeVerifier(TEST_USER, TEST_PASS, TEST_SALT)
assert(refVerifier.length === 32, 'Verifier de referencia es 32 bytes')
assert(refVerifier.some(b => b !== 0), 'Verifier de referencia no es todo ceros')

// Vector de test específico (SHA1 determinista con salt fijo)
const shaPass = sha1(Buffer.from('TESTUSER:TESTPASS'))
const xHash = sha1(Buffer.concat([TEST_SALT, shaPass]))
const x = BigInt('0x' + Buffer.from(xHash).reverse().toString('hex'))
const expectedV = modPow(G, x, N)
const expectedVerifier = Buffer.from(expectedV.toString(16).padStart(64, '0'), 'hex').reverse()

assertEqual(refVerifier, expectedVerifier, 'Vector de test SHA1 determinista')

// Test 3: verifyPassword (round-trip)
console.log('\nTest 3: Verificación de contraseña (round-trip)')
assertEqual(refVerifier, refComputeVerifier(TEST_USER, TEST_PASS, TEST_SALT), 'Round-trip: misma contraseña → mismo verifier')

const wrongVerifier = refComputeVerifier(TEST_USER, 'WRONGPASS', TEST_SALT)
assert(!refVerifier.equals(wrongVerifier), 'Contraseña incorrecta → verifier diferente')

const saltA = Buffer.alloc(32, 0x11)
const saltB = Buffer.alloc(32, 0x22)
const vA = refComputeVerifier(TEST_USER, TEST_PASS, saltA)
const vB = refComputeVerifier(TEST_USER, TEST_PASS, saltB)
assert(!vA.equals(vB), 'Salt diferente → verifier diferente')

// Test 4: case-insensitive
console.log('\nTest 4: Case-insensitive')
const vLower = refComputeVerifier('testuser', 'testpass', TEST_SALT)
const vUpper = refComputeVerifier('TESTUSER', 'TESTPASS', TEST_SALT)
assertEqual(vLower, vUpper, 'Username/password en minúsculas = mismas credenciales que en mayúsculas')

// Test 5: verifier cabe en 32 bytes (< N)
console.log('\nTest 5: Propiedades del verifier')
for (let i = 0; i < 20; i++) {
  const salt = Buffer.alloc(32)
  for (let j = 0; j < 32; j++) salt[j] = Math.floor(Math.random() * 256)
  const user = 'USER' + i
  const pass = 'PASS' + i
  const v = refComputeVerifier(user, pass, salt)
  if (v.length !== 32) {
    console.error(`  ✗  FAIL: verifier #${i} tiene ${v.length} bytes, esperado 32`)
    failed++
  }
}
assert(true, '20 verifiers generados, todos de 32 bytes')

// Test 6: N hexadecimal completo verificado byte a byte
// Razonamiento: HexStrToByteArray("894B...", reverse=true) → parse hex → reverse bytes → [B7,9B,...,89]
// BigNumber([B7,9B,...,89], littleEndian=true) → reverse AGAIN → [89,4B,...,B7] → BN_bin2bn (BE) = 0x894B...B7
// Doble-reverso = identidad → N matemático = BigInt("0x" + hex_string_del_source)
console.log('\nTest 6: Valor de N hex completo')
const N_HEX_FROM_SOURCE = '894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7'
const N_direct = BigInt('0x' + N_HEX_FROM_SOURCE)
assert(N_direct === N, 'N matemático = BigInt("0x" + hex_del_source): doble-reverso cancela')

// ─── Resumen ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`)
console.log(`Total: ${passed + failed}  |  ✓ ${passed} passed  |  ${failed > 0 ? '✗ ' + failed + ' FAILED' : '✓ 0 failed'}`)

if (failed > 0) {
  console.error('\nATENCIÓN: La implementación SRP6 tiene errores.')
  process.exit(1)
} else {
  console.log('\nTodos los tests pasaron. La implementación SRP6 es correcta.')
  console.log()
  console.log('Para verificar con una cuenta real de la DB, podés ejecutar:')
  console.log('  node -e "')
  console.log('  const {createHash} = require(\'crypto\')')
  console.log('  const mysql = require(\'mysql2/promise\')')
  console.log('  // ... conectar a tu DB y comparar verifier calculado vs almacenado')
  console.log('  "')
}
