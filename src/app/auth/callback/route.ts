import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Landing point for everything Supabase sends the applicant back to: the
 * confirmation link in the sign-up email, the magic sign-in link, and the
 * Google OAuth handshake.
 *
 * The provider hands back a short-lived `code`, which is exchanged for a
 * session cookie here. The `next` target is validated to be a same-site path so
 * this route can never be turned into an open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const requested = searchParams.get('next') ?? '/register'
  // Only relative, same-site paths are honoured.
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/register'

  // Supabase reports a failed confirmation or a denied OAuth consent like this.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (providerError) {
    return NextResponse.redirect(`${origin}/register?identity=error`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/register?identity=error`)
  }

  const supabase = await supabaseServer()
  if (!supabase) {
    return NextResponse.redirect(`${origin}/register?identity=unavailable`)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/register?identity=error`)
  }

  // Confirmed and signed in — the applicant continues exactly where they were.
  return NextResponse.redirect(`${origin}${next}`)
}
