import { headers } from 'next/headers'
import { hashWithSecret } from '@/lib/auth/crypto'

/** Current request IP, hashed. Raw addresses are never persisted. */
export async function clientIpHash(): Promise<string> {
  const headerList = await headers()
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'unknown'
  return hashWithSecret(ip)
}

export async function clientIp(): Promise<string> {
  const headerList = await headers()
  return (
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'unknown'
  )
}

export async function userAgent(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('user-agent')?.slice(0, 250) ?? null
}

/**
 * Same-origin enforcement for state-changing API routes (CSRF defence in depth).
 * Next.js server actions already validate the Origin/Host pair; this covers the
 * route handlers we own (analytics ingest, payment webhook excluded by design
 * because it authenticates with a provider signature).
 */
export async function assertSameOrigin(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * In-memory fixed-window rate limiter.
 *
 * Single-process by design: this deployment target is one Node server. For a
 * multi-instance deployment swap the store for Redis/Upstash — the call sites
 * do not change because they only depend on `rateLimit()`.
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function prune(now: number) {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  prune(now)
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 }
}

/** Convenience wrapper used by server actions: returns a user-facing message. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = 'Too many attempts. Please wait a moment and try again.',
): { ok: true } | { ok: false; message: string } {
  const result = rateLimit(key, limit, windowMs)
  if (result.ok) return { ok: true }
  return { ok: false, message }
}
