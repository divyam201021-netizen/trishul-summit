import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>

const SCRYPT_KEYLEN = 64

/**
 * Password hashing with scrypt (built into Node — no native dependency).
 * Format: scrypt$<salt-b64>$<hash-b64>. Verification is constant-time.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize('NFKC'), salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const [scheme, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const derived = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length)
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** Non-reversible, salted hash used for IP addresses and audit metadata. */
export function hashWithSecret(value: string, secret = process.env.SESSION_SECRET ?? 'dev-secret'): string {
  return createHmac('sha256', secret).update(value).digest('hex').slice(0, 32)
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = []
  if (password.length < 10) issues.push('Use at least 10 characters.')
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) issues.push('Include both upper- and lower-case letters.')
  if (!/[0-9]/.test(password)) issues.push('Include at least one number.')
  if (/^(?:password|letmein|trishul|qwerty)/i.test(password)) issues.push('Avoid obvious words and common passwords.')
  return issues
}

// ---------------------------------------------------------------------------
// TOTP (RFC 6238) — admin MFA. Kept dependency-free so the architecture is
// MFA-ready today and can be enforced per role without new infrastructure.
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(length = 32): string {
  const bytes = randomBytes(length)
  let out = ''
  for (const byte of bytes) out += BASE32_ALPHABET[byte % 32]
  return out
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '')
  let bits = 0
  let value = 0
  const output: number[] = []
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

export function totpCode(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buffer.writeUInt32BE(counter % 2 ** 32, 4)
  const digest = createHmac('sha1', key).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

/** Verifies a 6-digit code allowing ±1 time step of clock drift. */
export function verifyTotp(secret: string | null | undefined, code: string, at = Date.now()): boolean {
  if (!secret) return false
  const normalised = code.replace(/\D/g, '')
  if (normalised.length !== 6) return false
  const counter = Math.floor(at / 30_000)
  for (const drift of [-1, 0, 1]) {
    if (totpCode(secret, counter + drift) === normalised) return true
  }
  return false
}
