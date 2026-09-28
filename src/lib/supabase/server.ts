import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config'

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers.
 *
 * Requests run with the SIGNED-IN USER'S token, so every read and write is
 * subject to row level security. This is deliberate: the registry is never
 * touched with elevated privileges during registration, so a bug in the
 * application cannot hand one applicant another applicant's data.
 *
 * Writing cookies is only legal in a Server Action or Route Handler. During a
 * Server Component render `cookieStore.set` throws; the failure is swallowed
 * because middleware performs the refresh on every request, which is the
 * documented Next.js App Router pattern.
 */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Read-only render context — the middleware already refreshed tokens.
        }
      },
    },
  })
}

export interface SupabaseIdentity {
  id: string
  email: string | null
  fullName: string | null
  provider: string | null
  emailVerified: boolean
}

/**
 * The currently signed-in Supabase identity, or null.
 *
 * `getUser()` is used rather than `getSession()` because it verifies the JWT
 * with the auth server instead of trusting a cookie the client could have
 * tampered with.
 */
export async function getSupabaseIdentity(): Promise<SupabaseIdentity | null> {
  const supabase = await supabaseServer()
  if (!supabase) return null

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const user = data.user
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : null

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    provider: user.app_metadata?.provider ?? null,
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  }
}
