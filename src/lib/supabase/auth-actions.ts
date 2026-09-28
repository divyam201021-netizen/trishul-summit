'use server'

import { z } from 'zod'
import { supabaseServer } from './server'
import { isSupabaseConfigured } from './config'
import { clientIp, enforceRateLimit } from '@/lib/security/request'
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  zodFieldErrors,
  type ActionState,
} from '@/lib/security/validation'

/**
 * ============================================================================
 * SUPABASE IDENTITY — the gate at the start of registration
 * ============================================================================
 * Registration begins by establishing a Supabase identity. Everything after
 * that (profile, MUN information, consents, submission) hangs off that
 * identity, and the same identity is what the registry tables are keyed to.
 *
 * Rules held here:
 *   • Nobody is told they are signed in unless they actually are. The result of
 *     every call is confirmed with `getUser()` before success is reported.
 *   • A failure never leaks whether an address exists, and never returns a
 *     provider error verbatim.
 *   • When Supabase is not configured, the gate says so plainly instead of
 *     pretending, and the rest of the platform keeps working.
 */

const NOT_CONFIGURED =
  'Participant accounts are not available yet. The organizing committee is still configuring sign-in — you can still read about the summit and contact support.'

const GENERIC_FAILURE = 'We could not complete that. Check your details and try again.'

/** Absolute URL Supabase sends the applicant back to after email confirmation or OAuth. */
function authRedirect(next: string): string | undefined {
  const base = (process.env.APP_URL ?? '').replace(/\/$/, '')
  if (!base) return undefined
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

function friendlyAuthError(message: string | undefined): string {
  const text = (message ?? '').toLowerCase()
  if (text.includes('invalid login credentials')) {
    return 'That email address and password do not match an account. Check them, or use a different address if this is your first time.'
  }
  if (text.includes('email not confirmed')) {
    return 'This address has not been confirmed yet. Open the confirmation link we emailed you, then sign in.'
  }
  if (text.includes('user already registered') || text.includes('already been registered')) {
    return 'An account already exists for this address. Sign in instead to continue your application.'
  }
  if (text.includes('provider is not enabled') || text.includes('unsupported provider')) {
    return 'That sign-in method is not available yet. Use your email address and password.'
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many attempts just now. Please wait a few minutes and try again.'
  }
  if (text.includes('password should be at least')) {
    return 'That password is too short for our sign-in provider. Use at least 10 characters.'
  }
  return GENERIC_FAILURE
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

const signUpSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export async function signUpParticipant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: NOT_CONFIGURED }

  const limiter = enforceRateLimit(`supabase:signup:${await clientIp()}`, 10, 60 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const { fieldErrors, message } = zodFieldErrors(parsed.error)
    return { ok: false, message, fieldErrors }
  }

  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: NOT_CONFIGURED }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the registry when the participant row is first created.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: authRedirect('/register'),
    },
  })

  if (error) return { ok: false, message: friendlyAuthError(error.message) }

  // Supabase returns a user but NO session when the project requires email
  // confirmation. Reporting "signed in" here would be a lie, so the two cases
  // are reported differently.
  if (!data.session) {
    return {
      ok: true,
      message: `Account created. We sent a confirmation link to ${parsed.data.email} — open it, then sign in to continue your application.`,
      data: { awaitingConfirmation: true, email: parsed.data.email },
    }
  }

  return { ok: true, message: 'Account created. Continuing your application…', data: { signedIn: true } }
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
})

export async function signInParticipant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: NOT_CONFIGURED }

  const limiter = enforceRateLimit(`supabase:signin:${await clientIp()}`, 20, 15 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const { fieldErrors, message } = zodFieldErrors(parsed.error)
    return { ok: false, message, fieldErrors }
  }

  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: NOT_CONFIGURED }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) return { ok: false, message: friendlyAuthError(error?.message) }

  return { ok: true, message: 'Signed in. Continuing your application…', data: { signedIn: true } }
}

// ---------------------------------------------------------------------------
// Google (and any other enabled external provider)
// ---------------------------------------------------------------------------

/**
 * Starts the OAuth handshake and hands the URL back to the client, which
 * navigates to it. A Server Action cannot navigate the browser itself.
 *
 * The provider list is read from the project rather than assumed: if Google is
 * not enabled, the caller is told so instead of being sent to a broken screen.
 */
export async function startProviderSignIn(provider: string): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: NOT_CONFIGURED }

  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: NOT_CONFIGURED }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as 'google',
    options: { redirectTo: authRedirect('/register') },
  })

  if (error || !data?.url) {
    return {
      ok: false,
      message:
        'That sign-in method is not available yet. The organizing committee has not finished enabling it — use your email address and password instead.',
    }
  }

  return { ok: true, data: { redirectTo: data.url } }
}

// ---------------------------------------------------------------------------
// Magic link — the fallback for anyone who would rather not use a password
// ---------------------------------------------------------------------------

export async function sendSignInLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: NOT_CONFIGURED }

  const limiter = enforceRateLimit(`supabase:magic:${await clientIp()}`, 6, 60 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const parsed = z.object({ email: emailSchema }).safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    const { fieldErrors, message } = zodFieldErrors(parsed.error)
    return { ok: false, message, fieldErrors }
  }

  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: NOT_CONFIGURED }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true, emailRedirectTo: authRedirect('/register') },
  })

  if (error) return { ok: false, message: friendlyAuthError(error.message) }

  // Deliberately identical wording whether or not the address exists.
  return {
    ok: true,
    message: `If an account exists for ${parsed.data.email}, a sign-in link is on its way. Open it on this device to continue.`,
    data: { awaitingLink: true },
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOutOfSupabase(): Promise<ActionState> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: true, message: 'Signed out.' }
  await supabase.auth.signOut()
  return { ok: true, message: 'Signed out.' }
}

/**
 * Provider availability for the project, read at runtime.
 *
 * Supabase exposes this publicly, so the gate can offer Google only when Google
 * actually works, and can explain the confirmation step before the applicant
 * commits to it. Results are cached for the life of the server process, which
 * is accurate because provider settings change through the dashboard and a
 * restart is expected afterwards.
 */
export interface AuthProviderStatus {
  email: boolean
  google: boolean
  magicLink: boolean
  /** False when the project requires the applicant to confirm their address. */
  autoConfirm: boolean
  configured: boolean
}

let providerCache: { value: AuthProviderStatus; at: number } | null = null

export async function getAuthProviderStatus(): Promise<AuthProviderStatus> {
  const fallback: AuthProviderStatus = {
    email: isSupabaseConfigured(),
    google: false,
    magicLink: isSupabaseConfigured(),
    autoConfirm: false,
    configured: isSupabaseConfigured(),
  }
  if (!isSupabaseConfigured()) return fallback
  if (providerCache && Date.now() - providerCache.at < 5 * 60 * 1000) return providerCache.value

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: key ? { apikey: key } : undefined,
      cache: 'no-store',
    })
    if (!response.ok) return fallback
    const settings = (await response.json()) as {
      external?: Record<string, boolean>
      mailer_autoconfirm?: boolean
    }
    const value: AuthProviderStatus = {
      email: settings.external?.email ?? true,
      google: Boolean(settings.external?.google),
      magicLink: settings.external?.email ?? true,
      autoConfirm: Boolean(settings.mailer_autoconfirm),
      configured: true,
    }
    providerCache = { value, at: Date.now() }
    return value
  } catch {
    return fallback
  }
}
