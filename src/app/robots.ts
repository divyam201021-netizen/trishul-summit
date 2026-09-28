import type { MetadataRoute } from 'next'
import { getActiveSiteUrl } from '@/lib/seo'

/**
 * robots.txt.
 *
 * Public pages are indexable. Everything private is disallowed here *and*
 * carries an X-Robots-Tag header *and* sets page-level robots metadata — three
 * independent layers, because a crawling rule alone is not a security control.
 * Participant areas are disallowed because indexing a portal URL in a search
 * result would be a privacy failure even if the page itself is protected.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getActiveSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/portal',
          '/portal/',
          '/sign-in',
          '/register',
          '/api/',
          '/policies/marketing-updates',
        ],
      },
      {
        // A second, explicit rule so a crawler that ignores wildcards still
        // cannot reach the organizer workspace.
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot'],
        disallow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
