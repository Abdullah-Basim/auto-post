import crypto from 'node:crypto'
import { env } from '@/lib/env'

/**
 * AES-256-GCM encryption for credential storage at rest.
 *
 * Layout: base64( iv[12] || authTag[16] || ciphertext )
 *
 * Uses CREDENTIAL_ENCRYPTION_KEY (base64-encoded 32 bytes).
 * Generate one with: openssl rand -base64 32
 */

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const k = env.CREDENTIAL_ENCRYPTION_KEY
  if (!k) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set')
  }
  const buf = Buffer.from(k, 'base64')
  if (buf.length !== 32) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). Generate with: openssl rand -base64 32`
    )
  }
  return buf
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const key = getKey()
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) throw new Error('Encrypted payload too short')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}

/**
 * Tries to decrypt; returns the input unchanged if it isn't a valid encrypted
 * payload. Useful when migrating legacy plaintext credentials.
 */
export function safeDecrypt(maybeEncrypted: string): string {
  try {
    return decryptSecret(maybeEncrypted)
  } catch {
    return maybeEncrypted
  }
}
