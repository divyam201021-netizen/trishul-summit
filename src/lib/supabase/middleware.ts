import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config'

/**
 * Refreshes the Supabase auth cookie on every matched request.
 *
 * Supabase access tokens are short-lived. Without a refresh, a participant
 * would be silently signed out mid-application, and — worse — a Server
 * Component could render a signed-out state for a user who is actually signed
 * in (the documented "flash of signed-out content" bug). Refreshing here keeps
 * the cookie fresh before any render happens.
 *
 * When Supabase is not configured this is a pass-through, so the application
 * behaves exactly as it did before the integration.
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  if (!isSupabaseConfigured()) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Mirror onto the request so the downstream render sees the new values,
        // then onto the response so the browser persists them.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  try {
    // Touching getUser() is what triggers the refresh when the token is close
    // to expiry. The result is intentionally discarded here — authorisation is
    // decided by the route guards, not by this function.
    await supabase.auth.getUser()
  } catch {
    // A refresh failure must never take the whole site down; the signed-out
    // state is recovered on the next successful request.
  }

  return response
}
