/**
 * SRP6 de Blizzard para AzerothCore WotLK 3.3.5a (MASTER 2026)
 *
 * La tabla account usa:
 *   salt     BINARY(32)  — 32 bytes random
 *   verifier BINARY(32)  — g^x mod N, 32 bytes
 *   NO existe sha_pass_hash en master 2026.
 *
 * Convención de bytes: AzerothCore almacena los BigNumbers en little-endian.
 * El SHA1 de x se interpreta como little-endian para obtener el entero x.
 * El verifier se almacena como 32 bytes little-endian.
 *
 * Parámetros SRP6 de Blizzard WoW:
 *   g = 7
 *   N = DFB1FB689C4E0F2A1B4EBFBF8EB10108535006298B5BADBD5B53E1895E644B89
 *       (big-endian; en memoria AC es little-endian: 894B645E...B1DF)
 */

import { sha1 } from 'js-sha1'
import BigNumber from 'bignumber.js'

BigNumber.config({ EXPONENTIAL_AT: 1e9 })

// N primo de WoW SRP6, en big-endian (para aritmética BigNumber)
const N_BE = 'DFB1FB689C4E0F2A1B4EBFBF8EB10108535006298B5BADBD5B53E1895E644B89'
const N = new BigNumber(N_BE, 16)
const G = new BigNumber(7)

// ---------- helpers internos ----------

function sha1Bytes(data: Uint8Array | Buffer): Buffer {
  // js-sha1 acepta ArrayBuffer/Uint8Array, retorna hex string
  const hex = sha1(data instanceof Buffer ? new Uint8Array(data) : data)
  return Buffer.from(hex, 'hex')
}

/** Convierte BigNumber a Buffer de `len` bytes en little-endian. */
function bnToLEBuffer(bn: BigNumber, len: number): Buffer {
  const hex = bn.toString(16).padStart(len * 2, '0')
  const be = Buffer.from(hex, 'hex')
  return Buffer.from(be).reverse() as Buffer
}

/** Convierte Buffer little-endian a BigNumber. */
function leBufferToBN(buf: Buffer): BigNumber {
  const be = Buffer.from(buf).reverse().toString('hex')
  return new BigNumber(be, 16)
}

// ---------- API pública ----------

/**
 * Genera 32 bytes aleatorios para usar como salt.
 * Retorna Buffer que se guarda directamente en BINARY(32).
 */
export function generateSalt(): Buffer {
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto') as typeof import('crypto')
    randomBytes(32).copy(Buffer.from(bytes.buffer))
  }
  return Buffer.from(bytes)
}

/**
 * Calcula el verifier SRP6:
 *   sha_pass = SHA1(UPPER(username) + ":" + UPPER(password))   [20 bytes]
 *   x_hash   = SHA1(salt_bytes || sha_pass_bytes)              [20 bytes]
 *   x        = leBufferToBN(x_hash)   ← little-endian
 *   verifier = g^x mod N              → 32 bytes little-endian
 *
 * @param saltBuffer  Buffer de 32 bytes (tal como se guarda en DB)
 */
export function computeVerifier(username: string, password: string, saltBuffer: Buffer): Buffer {
  const passHashBuf = sha1Bytes(
    Buffer.from(`${username.toUpperCase()}:${password.toUpperCase()}`)
  )
  const combined = Buffer.concat([saltBuffer, passHashBuf])
  const xHashBuf = sha1Bytes(combined)

  const x = leBufferToBN(xHashBuf)
  const verifier = G.exponentiatedBy(x).modulo(N)
  return bnToLEBuffer(verifier, 32)
}

/**
 * Verifica una contraseña comparando el verifier calculado con el almacenado.
 * @param saltBuffer     Buffer de 32 bytes leído de account.salt
 * @param verifierBuffer Buffer de 32 bytes leído de account.verifier
 */
export function verifyPassword(
  username: string,
  password: string,
  saltBuffer: Buffer,
  verifierBuffer: Buffer
): boolean {
  try {
    const expected = computeVerifier(username, password, saltBuffer)
    return expected.equals(verifierBuffer)
  } catch {
    return false
  }
}

/**
 * Genera salt + verifier listos para INSERT en acore_auth.account.
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
