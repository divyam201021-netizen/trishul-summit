import type { NextConfig } from 'next'

/**
 * Origins the browser is allowed to reach for Supabase Auth and the registry,
 * derived from the configured project so the policy never has to be loosened
 * wholesale. Empty when Supabase is not configured, which keeps `connect-src`
 * at 'self' — exactly the pre-integration behaviour.
 */
const supabaseConnectOrigins = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return []
  try {
    const { protocol, host } = new URL(raw)
    return [`${protocol}//${host}`, `wss://${host}`]
  } catch {
    return []
  }
})()

/**
 * Security headers are applied globally here (HTTPS-ready architecture).
 * Content-Security-Policy is intentionally restrictive: no third-party scripts are
 * loaded anywhere in the product, so a same-origin policy is sufficient — the
 * only additions are the Supabase endpoints the registration flow must call.
 */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts and styled-jsx; keep dev-friendly but tight.
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      ["connect-src 'self'", ...supabaseConnectOrigins].join(' '),
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
]

const privateHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Server actions handle file-free form posts only; keep the body limit small.
    serverActions: { bodySizeLimit: '256kb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Participant and organizer areas must never be indexed, cached, or
        // served from a shared proxy. Declared per prefix (including the bare
        // prefix) so the rule cannot be bypassed by a missing trailing segment.
        // This is belt-and-braces alongside robots.txt and page-level metadata.
        source: '/(portal|admin|sign-in|register)/:path*',
        headers: privateHeaders,
      },
      { source: '/portal', headers: privateHeaders },
      { source: '/admin', headers: privateHeaders },
      { source: '/sign-in', headers: privateHeaders },
      { source: '/register', headers: privateHeaders },
    ]
  },
}

export default nextConfig
