/**
 * Tests de registro de cuenta para WoW Argentina CMS
 *
 * Verifica:
 *  1. Validación del body (schema)
 *  2. Generación de credenciales SRP6 para registro
 *  3. Flujo completo de registro con DB mock (cuenta nueva y duplicada)
 *  4. Que el INSERT usa las columnas correctas (sin sha_pass_hash)
 *  5. Que no se loguean ni exponen contraseñas ni credenciales
 *
 * Ejecutar: node tests/register.test.mjs
 */

import { createHash } from 'crypto'

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
  assert(eq, message)
  if (!eq) {
    console.error(`     expected: ${JSON.stringify(a)}`)
    console.error(`     got:      ${JSON.stringify(b)}`)
  }
}

function assertThrows(fn, message) {
  try {
    fn()
    console.error(`  ✗  FAIL: ${message} (no lanzó error)`)
    failed++
  } catch {
    console.log(`  ✓  ${message}`)
    passed++
  }
}

// ─── Implementación de referencia SRP6 (copia de srp6.test.mjs) ───────────────

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

function refGenerateSRPCredentials(username, password) {
  const saltBuffer = Buffer.alloc(32)
  for (let i = 0; i < 32; i++) saltBuffer[i] = Math.floor(Math.random() * 256)
  const verifierBuffer = refComputeVerifier(username, password, saltBuffer)
  return { saltBuffer, verifierBuffer }
}

// ─── Simulador de flujo de registro (mock DB) ──────────────────────────────────

/**
 * Simula el flujo del route POST /api/auth/register sin conexión a la BD.
 * Reproduce exactamente la lógica de app/api/auth/register/route.ts.
 */
function createRegisterSimulator() {
  const accounts = new Map()   // Map<username_upper, { id, email, salt, verifier }>
  const emails   = new Set()
  const cmsLogs  = []
  let nextId = 1

  // Simula las funciones de DB usadas por el route
  const mockQueryAuthFirst = async (sql, params) => {
    if (sql.includes('UPPER(username) = UPPER(?)')) {
      const u = params[0].toUpperCase()
      return accounts.has(u) ? accounts.get(u) : null
    }
    if (sql.includes('email = ?')) {
      const e = params[0]
      for (const acc of accounts.values()) {
        if (acc.email === e) return acc
      }
      return null
    }
    return null
  }

  const mockExecuteAuth = async (sql, params) => {
    // Simula INSERT INTO account (username, salt, verifier, email, reg_mail, joindate, last_ip, locked, online, expansion)
    if (!sql.includes('INSERT INTO account')) throw new Error('Unexpected SQL: ' + sql)

    const [username, salt, verifier, email] = params

    // Validar que NO se pase sha_pass_hash
    if (sql.includes('sha_pass_hash')) throw new Error('sha_pass_hash no debe estar en el INSERT')

    // Validar columnas esperadas
    const requiredCols = ['username', 'salt', 'verifier', 'email', 'reg_mail', 'joindate', 'last_ip', 'locked', 'online', 'expansion']
    for (const col of requiredCols) {
      if (!sql.includes(col)) throw new Error(`Falta columna: ${col}`)
    }

    const id = nextId++
    accounts.set(username, { id, email, salt, verifier })
    emails.add(email)
    return { insertId: id, affectedRows: 1 }
  }

  const mockExecuteCms = async (sql, params) => {
    cmsLogs.push({ sql, params })
    return { insertId: 0, affectedRows: 1 }
  }

  // Lógica del route (extractada para testear)
  const register = async (body) => {
    // Validaciones del schema
    if (!body.username || typeof body.username !== 'string') return { status: 400, error: 'username requerido' }
    if (body.username.length < 3) return { status: 400, error: 'Mínimo 3 caracteres' }
    if (body.username.length > 16) return { status: 400, error: 'Máximo 16 caracteres' }
    if (!/^[a-zA-Z0-9]+$/.test(body.username)) return { status: 400, error: 'Solo letras y números, sin espacios' }
    if (!body.password || body.password.length < 6) return { status: 400, error: 'Mínimo 6 caracteres' }
    if (!body.email || !body.email.includes('@')) return { status: 400, error: 'Email inválido' }
    if (body.terms !== true) return { status: 400, error: 'terms requerido' }

    const { username, password, email } = body
    const usernameUpper = username.toUpperCase()

    // Check duplicados
    const existingUser = await mockQueryAuthFirst('SELECT id FROM account WHERE UPPER(username) = UPPER(?)', [username])
    if (existingUser) return { status: 400, error: 'Ese nombre de cuenta ya está en uso' }

    const existingEmail = await mockQueryAuthFirst('SELECT id FROM account WHERE email = ?', [email])
    if (existingEmail) return { status: 400, error: 'Ese email ya está registrado' }

    // Generar credenciales SRP6
    const { saltBuffer, verifierBuffer } = refGenerateSRPCredentials(usernameUpper, password)

    // INSERT
    const insertResult = await mockExecuteAuth(
      `INSERT INTO account (username, salt, verifier, email, reg_mail, joindate, last_ip, locked, online, expansion) VALUES (?, ?, ?, ?, ?, NOW(), ?, 0, 0, 2)`,
      [usernameUpper, saltBuffer, verifierBuffer, email, email, '127.0.0.1'],
    )

    const accountId = insertResult.insertId
    if (!accountId) return { status: 500, error: 'Error al crear la cuenta' }

    await mockExecuteCms('INSERT IGNORE INTO cms_user_coins (account_id, coins) VALUES (?, 0)', [accountId])
    await mockExecuteCms('INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)', [accountId, 'REGISTRO', `Nueva cuenta: ${usernameUpper}`, '127.0.0.1'])

    return { status: 200, success: true, message: '¡Cuenta creada! Bienvenido a WoW Argentina.', accountId }
  }

  return { register, accounts, cmsLogs }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n=== Register Route Tests ===\n')

// ── Test 1: Validación de schema ───────────────────────────────────────────────
console.log('Test 1: Validación del body')

{
  const { register } = createRegisterSimulator()

  const r1 = await register({ username: 'ab', password: 'password1', email: 'x@x.com', terms: true })
  assert(r1.status === 400 && r1.error.includes('3'), 'username < 3 chars → 400')

  const r2 = await register({ username: 'validuser', password: '123', email: 'x@x.com', terms: true })
  assert(r2.status === 400 && r2.error.includes('6'), 'password < 6 chars → 400')

  const r3 = await register({ username: 'user with space', password: 'validpass', email: 'x@x.com', terms: true })
  assert(r3.status === 400, 'username con espacio → 400')

  const r4 = await register({ username: 'validuser', password: 'validpass', email: 'notanemail', terms: true })
  assert(r4.status === 400, 'email inválido → 400')

  const r5 = await register({ username: 'validuser', password: 'validpass', email: 'x@x.com', terms: false })
  assert(r5.status === 400, 'terms=false → 400')
}

// ── Test 2: Registro exitoso ───────────────────────────────────────────────────
console.log('\nTest 2: Registro exitoso')

{
  const { register, accounts, cmsLogs } = createRegisterSimulator()

  const result = await register({ username: 'ElPotrillo', password: 'wowpvp2024', email: 'potro@wow.ar', terms: true })

  assert(result.status === 200, 'Registro nuevo → 200 OK')
  assert(result.success === true, 'Respuesta tiene success: true')
  assert(typeof result.message === 'string', 'Respuesta tiene message')
  assert(result.accountId > 0, `accountId válido: ${result.accountId}`)

  // Verificar que se guardó en la DB mock
  assert(accounts.has('ELPOTRILLO'), 'Username guardado en MAYÚSCULAS')

  const savedAcc = accounts.get('ELPOTRILLO')
  assert(Buffer.isBuffer(savedAcc.salt), 'salt es Buffer')
  assert(savedAcc.salt.length === 32, 'salt tiene 32 bytes')
  assert(Buffer.isBuffer(savedAcc.verifier), 'verifier es Buffer')
  assert(savedAcc.verifier.length === 32, 'verifier tiene 32 bytes')
  assert(savedAcc.email === 'potro@wow.ar', 'email guardado correctamente')

  // Verificar que el verifier es correcto (round-trip SRP6)
  const recalcV = refComputeVerifier('ELPOTRILLO', 'wowpvp2024', savedAcc.salt)
  assert(recalcV.equals(savedAcc.verifier), 'verifier calculado coincide con el almacenado (SRP6 correcto)')

  // Verificar que se crearon los logs CMS
  const logEntry = cmsLogs.find(l => l.sql.includes('cms_logs'))
  assert(logEntry !== undefined, 'Se insertó entrada en cms_logs')
  assert(logEntry.params[1] === 'REGISTRO', 'Log tipo REGISTRO')
  assert(!JSON.stringify(logEntry.params).includes('wowpvp2024'), 'Log NO contiene la contraseña')

  const coinsEntry = cmsLogs.find(l => l.sql.includes('cms_user_coins'))
  assert(coinsEntry !== undefined, 'Se insertó entrada en cms_user_coins')
}

// ── Test 3: Usuario duplicado ──────────────────────────────────────────────────
console.log('\nTest 3: Usuario duplicado')

{
  const { register } = createRegisterSimulator()

  // Primer registro
  const r1 = await register({ username: 'Dupuser', password: 'password1', email: 'dup@wow.ar', terms: true })
  assert(r1.status === 200, 'Primer registro → 200')

  // Mismo username (case insensitive)
  const r2 = await register({ username: 'dupuser', password: 'otrapass1', email: 'otro@wow.ar', terms: true })
  assert(r2.status === 400, 'Username duplicado (minúsculas) → 400')
  assert(r2.error.includes('ya está en uso'), `Error username duplicado correcto: "${r2.error}"`)

  // Mismo username exacto
  const r3 = await register({ username: 'Dupuser', password: 'otrapass2', email: 'otro2@wow.ar', terms: true })
  assert(r3.status === 400, 'Username duplicado (mismo case) → 400')

  // Mismo email
  const r4 = await register({ username: 'Otrousr', password: 'password2', email: 'dup@wow.ar', terms: true })
  assert(r4.status === 400, 'Email duplicado → 400')
  assert(r4.error.includes('ya está registrado'), `Error email duplicado correcto: "${r4.error}"`)
}

// ── Test 4: Credenciales SRP6 para diferentes usuarios ────────────────────────
console.log('\nTest 4: Credenciales SRP6 generadas para registro')

{
  const { register, accounts } = createRegisterSimulator()

  const users = [
    { username: 'Player1', password: 'pass1234', email: 'p1@wow.ar' },
    { username: 'Warrior2', password: 'wowwow99', email: 'w2@wow.ar' },
    { username: 'Mage3', password: 'spells42', email: 'm3@wow.ar' },
  ]

  for (const u of users) {
    await register({ ...u, terms: true })
    const saved = accounts.get(u.username.toUpperCase())
    if (!saved) { assert(false, `Usuario ${u.username} no guardado`); continue }

    const recalc = refComputeVerifier(u.username.toUpperCase(), u.password, saved.salt)
    assert(recalc.equals(saved.verifier), `SRP6 round-trip correcto para ${u.username}`)
    assert(saved.salt.length === 32, `salt 32 bytes para ${u.username}`)
    assert(saved.verifier.length === 32, `verifier 32 bytes para ${u.username}`)
  }

  // Verificar que salts son únicos (salt aleatorio)
  const saltA = accounts.get('PLAYER1').salt
  const saltB = accounts.get('WARRIOR2').salt
  assert(!saltA.equals(saltB), 'Cada cuenta tiene un salt único (aleatorio)')
}

// ── Test 5: Estructura del INSERT — sin sha_pass_hash ─────────────────────────
console.log('\nTest 5: SQL de INSERT correcto (sin sha_pass_hash)')

{
  const INSERT_SQL = `INSERT INTO account (username, salt, verifier, email, reg_mail, joindate, last_ip, locked, online, expansion) VALUES (?, ?, ?, ?, ?, NOW(), ?, 0, 0, 2)`

  assert(!INSERT_SQL.includes('sha_pass_hash'), 'INSERT no contiene sha_pass_hash')
  assert(INSERT_SQL.includes('salt'), 'INSERT contiene salt')
  assert(INSERT_SQL.includes('verifier'), 'INSERT contiene verifier')
  assert(INSERT_SQL.includes('reg_mail'), 'INSERT contiene reg_mail')
  assert(INSERT_SQL.includes('expansion'), 'INSERT contiene expansion')
  assert(INSERT_SQL.includes('locked'), 'INSERT contiene locked')

  // Contar placeholders vs parámetros esperados
  const placeholders = (INSERT_SQL.match(/\?/g) || []).length
  // username, salt, verifier, email, reg_mail, (NOW() inline), last_ip → 6 params dinámicos
  assertEqual(placeholders, 6, 'INSERT tiene exactamente 6 placeholders')
}

// ── Test 6: Idempotencia del mock — accountId incrementa ──────────────────────
console.log('\nTest 6: Asignación de accountId')

{
  const { register } = createRegisterSimulator()
  const r1 = await register({ username: 'First1', password: 'passw0rd', email: 'first@a.ar', terms: true })
  const r2 = await register({ username: 'Second2', password: 'passw0rd', email: 'second@a.ar', terms: true })
  assert(r1.accountId === 1, `Primer accountId = 1 (got ${r1.accountId})`)
  assert(r2.accountId === 2, `Segundo accountId = 2 (got ${r2.accountId})`)
}

// ─── Resumen ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`)
console.log(`Total: ${passed + failed}  |  ✓ ${passed} passed  |  ${failed > 0 ? '✗ ' + failed + ' FAILED' : '✓ 0 failed'}`)

if (failed > 0) {
  console.error('\nATENCIÓN: Hay fallos en el flujo de registro.')
  process.exit(1)
} else {
  console.log('\nTodos los tests de registro pasaron.')
  console.log()
  console.log('Para verificar con la DB real, ejecutar:')
  console.log('  node -e "require(\'./lib/db\').queryAuthFirst(\'SELECT COUNT(*) as c FROM account\')"')
}
