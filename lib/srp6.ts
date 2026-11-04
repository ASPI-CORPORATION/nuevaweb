/**
 * SRP6 de Blizzard para AzerothCore WotLK 3.3.5a (MASTER 2026)
 *
 * Parámetros verificados contra:
 *   src/common/Cryptography/Authentication/SRP6.cpp (AzerothCore master)
 *
 *   SRP6::N = HexStrToByteArray<32>("894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7", reverse=true)
 *   BigNumber(_N) usa littleEndian=true → double-reverse → valor matemático = 0x894B...9BB7
 *   SRP6::g = { 7 }
 *
 * Algoritmo (CalculateVerifier en SRP6.cpp):
 *   sha_pass = SHA1(UPPER(username) + ":" + UPPER(password))   // 20 bytes
 *   x_hash   = SHA1(salt_bytes || sha_pass_bytes)              // 20 bytes
 *   x        = BigInt(x_hash, littleEndian)                    // little-endian
 *   verifier = g^x mod N                                       // little-endian 32 bytes en DB
 *
 * N es un safe prime: N primo y (N−1)/2 primo (verificado con Miller-Rabin).
 * Se usa BigInt nativo de Node.js para aritmética exacta y modular exponentiation eficiente.
 */

import { sha1 } from 'js-sha1'

// N primo de WoW SRP6 — valor matemático (big-endian).
// Derivado de: HexStrToByteArray<32>("894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7", true)
// + BigNumber(array, littleEndian=true) → doble reverso → 0x894B...9BB7
const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7')
const G = BigInt(7)

// ---------- helpers internos ----------

/**
 * Modular exponentiation: base^exp mod m
 * Usa el método binary right-to-left para evitar computar g^x completo.
 */
function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n
  base = base % m
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % m
    exp >>= 1n
    base = (base * base) % m
  }
  return result
}

/** SHA1 de un Buffer → Buffer de 20 bytes */
function sha1Buf(data: Buffer): Buffer {
  return Buffer.from(sha1(new Uint8Array(data)), 'hex')
}

/** Buffer little-endian → BigInt (valor matemático) */
function leBufferToBigInt(buf: Buffer): bigint {
  const hex = Buffer.from(buf).reverse().toString('hex')
  return hex ? BigInt('0x' + hex) : 0n
}

/** BigInt → Buffer de `len` bytes en little-endian */
function bigIntToLEBuffer(n: bigint, len: number): Buffer {
  const hex = n.toString(16).padStart(len * 2, '0')
  return Buffer.from(hex, 'hex').reverse() as Buffer
}

/** Normaliza a Buffer de 32 bytes lo que mysql2 retorna para BINARY(32) */
function toBuffer32(val: Buffer | Uint8Array | unknown): Buffer {
  if (Buffer.isBuffer(val)) return val
  if (val instanceof Uint8Array) return Buffer.from(val)
  if (typeof val === 'string') return Buffer.from(val, 'binary')
  // mysql2 puede retornar objetos Buffer-like
  return Buffer.from(val as ArrayBuffer)
}

// ---------- API pública ----------

/**
 * Genera 32 bytes aleatorios para el salt.
 * Se guardan directamente en BINARY(32).
 */
export function generateSalt(): Buffer {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const bytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(bytes)
    return Buffer.from(bytes)
  }
  // Node.js fallback
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('crypto') as typeof import('crypto')).randomBytes(32)
}

/**
 * Calcula el verifier SRP6.
 * Reproduce exactamente SRP6::CalculateVerifier() de AzerothCore.
 *
 * @param username    Nombre de cuenta (se convierte a MAYÚSCULAS)
 * @param password    Contraseña (se convierte a MAYÚSCULAS)
 * @param saltBuffer  32 bytes de BINARY(32) tal como se leen de la DB
 * @returns           32 bytes little-endian listos para BINARY(32)
 */
export function computeVerifier(username: string, password: string, saltBuffer: Buffer): Buffer {
  const salt = toBuffer32(saltBuffer)

  // H(UPPER(username) || ":" || UPPER(password))
  const shaPass = sha1Buf(
    Buffer.from(`${username.toUpperCase()}:${password.toUpperCase()}`)
  )

  // H(salt || sha_pass)
  const xHash = sha1Buf(Buffer.concat([salt, shaPass]))

  // x = BigInt(xHash, littleEndian) — igual que BigNumber(array, littleEndian=true) de AC
  const x = leBufferToBigInt(xHash)

  // v = g^x mod N
  const v = modPow(G, x, N)

  // Almacenar como 32 bytes little-endian — igual que ToByteArray<32>() de AC
  return bigIntToLEBuffer(v, 32)
}

/**
 * Verifica una contraseña comparando el verifier calculado con el almacenado en la DB.
 * Retorna true solo si el verifier calculado coincide byte a byte.
 *
 * @param saltBuffer     32 bytes leídos de account.salt
 * @param verifierBuffer 32 bytes leídos de account.verifier
 */
export function verifyPassword(
  username: string,
  password: string,
  saltBuffer: Buffer,
  verifierBuffer: Buffer
): boolean {
  try {
    const salt = toBuffer32(saltBuffer)
    const stored = toBuffer32(verifierBuffer)
    if (salt.length !== 32 || stored.length !== 32) return false
    const expected = computeVerifier(username, password, salt)
    return expected.equals(stored)
  } catch {
    return false
  }
}

/**
 * Genera salt + verifier para INSERT en acore_auth.account.
 */
export function generateSRPCredentials(username: string, password: string) {
  const saltBuffer = generateSalt()
  const verifierBuffer = computeVerifier(username, password, saltBuffer)
  return { saltBuffer, verifierBuffer }
}

/**
 * Genera nuevos salt + verifier para cambio de contraseña.
 */
export function updatePasswordCredentials(username: string, newPassword: string) {
  return generateSRPCredentials(username, newPassword)
}
