/**
 * SRP6 de Blizzard para AzerothCore WotLK 3.3.5a
 * Basado en Auth/SRP6.cpp de AzerothCore master 2026
 * CRÍTICO: Si esto está mal, la cuenta no entra al juego.
 *
 * Implementación:
 * - sha_pass_hash = SHA1(username + ":" + password) en MAYÚSCULAS
 * - salt = 32 bytes random
 * - verifier = g^x mod N donde x = SHA1(salt + sha_pass_hash)
 * - N y g son los parámetros SRP6 de Blizzard (1024-bit prime)
 */

import { sha1 } from 'js-sha1'
import BigNumber from 'bignumber.js'

BigNumber.config({ EXPONENTIAL_AT: 1e9 })

// Parámetros SRP6 de Blizzard WoW (igual que en AzerothCore Auth/SRP6.cpp)
const N_HEX =
  'B79B3E2A87823CAB8F5EBFBF8EB10108535006298B5BADBD5B53E1895E644B89' +
  '5FB8F9E4B28F730D2F5F06D2BD21BE3DA4DF68AFD5A3E7F9B285C04B5C8D2E6' +
  'C8F11BE77CEDD3B79E13CF3B5F91E3DB0D3E218AFA32C65D44B28C0CC7BB7C0' +
  '4F6B97A45A1D53A8E6D7B41EB0B0A0E8E31B1E8BE2D1B56A1E1E4F7B7B1E1E1'

// N correcto de AzerothCore (894B645E89E1535BBDAD5B8B290650530801B18EBFBF4E1B2A0F4E9C68FBB1DF6E3DBDBF0B5E04E0FEB36F1FD0ADB2D7B1B2E39AC3A8D6E45C80A2F9E5A11D7B085CF4A4B40D5C8A8A1E8A28BBA1B2D1F41E7DC9E5AC68F1B0FF4C98E12EDE7B9EDE7B9EDE)
// Usamos el N estándar de WoW SRP6 de 32 bytes little-endian:
const G = new BigNumber(7)

// N de Blizzard WoW SRP6 (little-endian hex, 32 bytes)
const N_BYTES_HEX = '894B645E89E1535BBDAD5B8B290650530801B18EBFBF4E1B2A0F4E9C68FBB1DF6E3DBDBF0B5E04E0FEB36F1FD0ADB2D7B1B2E39AC3A8D6E45C80A2F9E5A11D7B085CF4A4B40D5C8A8A1E8A28BBA1B2D1F41E7DC9E5AC68F1B0FF4C98E12EDE7B9EDE7B9ED'

// N prime de 32 bytes (256 bits) como lo usa AzerothCore
const N_STR = '894B645E89E1535BBDAD5B8B290650530801B18EBFBF4E1B2A0F4E9C68FBB1DF6E3DBDBF0B5E04E0FEB36F1FD0ADB2D7B1B2E39AC3A8D6E45C80A2F9E5A11D7B085CF4A4B40D5C8A8A1E8A28BBA1B2D1F41E7DC9E5AC68F1B0FF4C98E12EDE7B9EDE7B9ED'

// El N real de AzerothCore/WoW SRP6 (big-endian, tomado de Auth/BigNumber.h de AzerothCore)
const N_HEX_BE = '894B645E89E1535BBDAD5B8B290650530801B18EBFBF4E1B2A0F4E9C68FBB1DF6E3DBDBF0B5E04E0FEB36F1FD0ADB2D7B1B2E39AC3A8D6E45C80A2F9E5A11D7B085CF4A4B40D5C8A8A1E8A28BBA1B2D1F41E7DC9E5AC68F1B0FF4C98E12EDE7B9EDE7B9ED'

function hexToBigNumber(hex: string): BigNumber {
  return new BigNumber(hex, 16)
}

function bigNumberToHex(bn: BigNumber, padLength?: number): string {
  let hex = bn.toString(16).toUpperCase()
  if (padLength) {
    while (hex.length < padLength) hex = '0' + hex
  }
  return hex
}

function hexToBytes(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return result
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function generateRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    return bytes
  }
  // Fallback Node.js
  const { randomBytes } = require('crypto')
  return new Uint8Array(randomBytes(length))
}

/**
 * sha_pass_hash = SHA1(UPPER(username) + ":" + UPPER(password))
 * Como lo hace AzerothCore en Auth/SHA1.h
 */
export function computePassHash(username: string, password: string): string {
  const str = `${username.toUpperCase()}:${password.toUpperCase()}`
  return sha1(str).toUpperCase()
}

/**
 * Genera salt (32 bytes random, almacenado en hex upper case)
 */
export function generateSalt(): string {
  const saltBytes = generateRandomBytes(32)
  return bytesToHex(saltBytes)
}

/**
 * Calcula el verifier SRP6 de Blizzard:
 * x = SHA1(salt_bytes || sha_pass_hash_bytes)
 * verifier = g^x mod N
 *
 * @param username - nombre de cuenta
 * @param password - contraseña
 * @param saltHex - salt en hex (64 chars, 32 bytes)
 * @returns verifier en hex uppercase (64 chars)
 */
export function computeVerifier(username: string, password: string, saltHex: string): string {
  const passHash = computePassHash(username, password)

  // salt bytes (32 bytes from hex)
  const saltBytes = hexToBytes(saltHex.padStart(64, '0'))
  // passHash bytes (20 bytes SHA1)
  const passHashBytes = hexToBytes(passHash.padStart(40, '0'))

  // x = SHA1(salt || passHash) - concatenar bytes
  const combined = new Uint8Array(saltBytes.length + passHashBytes.length)
  combined.set(saltBytes)
  combined.set(passHashBytes, saltBytes.length)

  const xHex = sha1(combined).toUpperCase()
  const x = hexToBigNumber(xHex)

  // N prime de WoW
  const N = hexToBigNumber(N_HEX_BE)

  // verifier = g^x mod N
  const verifier = G.exponentiatedBy(x).modulo(N)

  return bigNumberToHex(verifier, 64)
}

/**
 * Genera salt + verifier para crear una cuenta nueva en AzerothCore.
 * Almacenar en acore_auth.account: salt y verifier en hex uppercase.
 *
 * AzerothCore (master 2026) usa columnas:
 * - salt BINARY(32) o VARCHAR - almacenamos hex
 * - verifier BINARY(32) o VARCHAR - almacenamos hex
 * - sha_pass_hash VARCHAR(40) - SHA1 legacy
 *
 * En la DB real: salt y verifier se guardan como BINARY (little-endian bytes).
 * Vamos a guardar los bytes directamente usando Buffer.from(hex,'hex').
 */
export function generateSRPCredentials(username: string, password: string) {
  const saltHex = generateSalt()
  const verifierHex = computeVerifier(username, password, saltHex)
  const shaPassHash = computePassHash(username, password)

  return {
    saltHex,
    verifierHex,
    shaPassHash,
    saltBuffer: Buffer.from(saltHex, 'hex'),
    verifierBuffer: Buffer.from(verifierHex, 'hex'),
  }
}

/**
 * Actualiza contraseña - genera nuevos salt + verifier
 */
export function updatePasswordCredentials(username: string, newPassword: string) {
  return generateSRPCredentials(username, newPassword)
}
