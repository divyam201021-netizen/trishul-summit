import type { NextRequest } from 'next/server'
import { refreshSupabaseSession } from '@/lib/supabase/middleware'

/**
 * Single entry point for middleware. Today it only keeps the Supabase session
 * cookie fresh; route protection still lives in the per-route guards so there
 * is exactly one source of truth for who may see what.
 *
 * Static assets, image optimisation output and the metadata routes are excluded
 * so a refresh never runs for a request that cannot carry a session.
 */
export async function middleware(request: NextRequest) {
  return refreshSupabaseSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|map)$).*)',
  ],
}
