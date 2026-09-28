import type { Metadata } from 'next'
import { getEventConfig, type EventConfig } from '@/lib/config'

/** Canonical origin: environment wins, otherwise the configured base URL. */
export function getActiveSiteUrl(config?: EventConfig): string {
  const fromEnv = process.env.APP_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const configured = config?.text('seo.canonicalBaseUrl')
  if (configured) return configured.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export interface PageSeoInput {
  title: string
  description?: string | null
  path: string
  /** Set for pages that must never be indexed (portal, admin, registration). */
  noindex?: boolean
}

/**
 * Builds consistent metadata for every public page: title, description,
 * Open Graph, canonical URL and a social preview image (a generated placeholder
 * until the organizer supplies artwork).
 */
export async function buildPageMetadata({
  title,
  description,
  path,
  noindex,
}: PageSeoInput): Promise<Metadata> {
  const config = await getEventConfig()
  const siteUrl = getActiveSiteUrl(config)
  const url = `${siteUrl}${path === '/' ? '' : path}`
  const ogImage = config.text('seo.ogImageUrl')
  const fallbackDescription =
    config.text('seo.defaultDescription') ??
    `${config.text('identity.name') ?? 'Trishul Summit'} — online Model United Nations summit platform.`

  return {
    title,
    description: description ?? fallbackDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description: description ?? fallbackDescription,
      images: [{ url: ogImage ?? '/opengraph-image', alt: `${title} — social preview` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description ?? fallbackDescription,
    },
    ...(noindex ? { robots: { index: false, follow: false, nocache: true } } : {}),
  }
}

/** Machine-readable JSON-LD describing the event, with placeholders omitted. */
export function eventJsonLd(config: EventConfig, siteUrl: string) {
  const name = config.text('identity.name') ?? 'Trishul Summit'
  const startDate = config.text('event.startDate')
  const endDate = config.text('event.endDate')
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: siteUrl,
    organizer: {
      '@type': 'Organization',
      name: config.text('identity.organizer') ?? undefined,
    },
  }
  const description = config.text('identity.shortDescription') ?? config.text('identity.longDescription')
  if (description) json.description = description
  if (startDate) json.startDate = startDate
  if (endDate) json.endDate = endDate
  // Deliberately absent when unknown: no invented dates, no invented offers.
  return json
}
