'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config'

/**
 * A single browser client for the whole tab. Creating more than one instance
 * causes duplicate auth listeners and repeated token refreshes, so this is
 * memoised at module scope.
 *
 * Returns null when Supabase is not configured, so callers can present an
 * honest "identity is unavailable" state rather than throwing.
 */
let browserClient: SupabaseClient | null = null

export function supabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return browserClient
}

/**
 * Whether the build has a Supabase project attached. Exposed so client
 * components can branch without importing server-only configuration.
 */
export const supabaseReady = isSupabaseConfigured()
