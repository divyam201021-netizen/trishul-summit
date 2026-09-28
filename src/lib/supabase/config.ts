/**
 * ============================================================================
 * SUPABASE CONFIGURATION
 * ============================================================================
 * Supabase provides two things for Trishul Summit:
 *
 *   1. IDENTITY  — `auth.users` holds the account. Email + password, Google and
 *                  magic link are whatever the project has enabled; the app
 *                  discovers this at runtime rather than assuming.
 *   2. REGISTRY  — the `trishul_*` tables hold the participant record and every
 *                  answer they submit, so the organizing committee can manage
 *                  participants without touching the application database.
 *
 * Only publishable values are read here. The registry is enforced by row level
 * security, so the browser client holding this key is by design, and the server
 * never needs a service-role secret for the registration flow.
 *
 * When the values are absent the platform degrades instead of breaking: the
 * registration gate reports that identity is unavailable and the existing
 * application-owned registration flow keeps working.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

/** True when both publishable values are present, so Supabase may be used. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

/**
 * Origins the browser must be allowed to reach for Supabase to work.
 * Used to build the Content-Security-Policy so the policy stays restrictive
 * instead of being loosened wholesale.
 */
export function supabaseConnectSources(): string[] {
  if (!isSupabaseConfigured()) return []
  try {
    const url = new URL(SUPABASE_URL)
    // Realtime uses a websocket on the same host.
    return [`${url.protocol}//${url.host}`, `wss://${url.host}`]
  } catch {
    return []
  }
}

/** Redirect target for auth emails and OAuth callbacks. */
export function authCallbackUrl(next = '/portal'): string {
  const base = (process.env.APP_URL ?? '').replace(/\/$/, '') || ''
  const safeNext = next.startsWith('/') ? next : '/portal'
  return `${base}/auth/callback?next=${encodeURIComponent(safeNext)}`
}
