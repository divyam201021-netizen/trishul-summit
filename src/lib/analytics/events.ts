/**
 * ============================================================================
 * PRIVACY-CONSCIOUS ANALYTICS
 * ============================================================================
 * Analytics exists to answer "where do people drop off?", never "who are they?".
 *
 * Guarantees enforced below (and re-checked server-side on ingest):
 *  • Only allow-listed event names are accepted.
 *  • Only allow-listed, enumerated property values survive.
 *  • No free text, no emails, no application references, no participant names,
 *    no payment credentials.
 *  • No cookies and no cross-site identifiers: the client keeps an ephemeral
 *    random session id in sessionStorage only.
 */

export const ANALYTICS_EVENTS = [
  'page_view',
  'registration_cta_clicked',
  'committee_viewed',
  'registration_started',
  'registration_step_completed',
  'registration_abandoned',
  'registration_submitted',
  'payment_started',
  'payment_completed',
  'payment_failed',
  'faq_interaction',
  'support_contact',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

export const isAnalyticsEvent = (value: unknown): value is AnalyticsEventName =>
  typeof value === 'string' && (ANALYTICS_EVENTS as readonly string[]).includes(value)

/** Property keys that may be recorded, per event. Anything else is dropped. */
const ALLOWED_PROPS: Record<AnalyticsEventName, string[]> = {
  page_view: ['path', 'surface'],
  registration_cta_clicked: ['location', 'label'],
  committee_viewed: ['slug'],
  registration_started: [],
  registration_step_completed: ['step', 'stepName'],
  registration_abandoned: ['step', 'stepName'],
  registration_submitted: [],
  payment_started: ['provider'],
  payment_completed: ['provider'],
  payment_failed: ['provider', 'reason'],
  faq_interaction: ['action', 'index'],
  support_contact: ['channel'],
}

/** Longest string we will store for a property value. */
const MAX_VALUE_LENGTH = 64

/** Patterns that must never reach the analytics table, even inside a value. */
const PII_PATTERNS: RegExp[] = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // email address
  /TRI-[A-Z0-9]{6,}/i, // application reference
  /\+?\d[\d\s().-]{7,}\d/, // phone-like string
]

export type AnalyticsProps = Record<string, string | number | boolean | null>

/**
 * Strips everything that is not explicitly allowed. Returns an empty object if
 * the payload is unsafe — the event is still counted, just without detail.
 */
export function sanitizeAnalyticsProps(
  name: AnalyticsEventName,
  props: Record<string, unknown> | undefined | null,
): AnalyticsProps {
  if (!props) return {}
  const allowed = ALLOWED_PROPS[name] ?? []
  const clean: AnalyticsProps = {}

  for (const [key, value] of Object.entries(props)) {
    if (!allowed.includes(key)) continue
    if (value === null || value === undefined) continue

    if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value
      continue
    }

    const text = String(value).slice(0, MAX_VALUE_LENGTH)
    if (PII_PATTERNS.some((pattern) => pattern.test(text))) continue
    if (/^\[.*TBD.*\]$/i.test(text)) continue
    // Drop anything that looks like free text rather than an identifier.
    if (text.split(/\s+/).length > 6) continue
    clean[key] = text
  }

  return clean
}

export function canonicalPath(path: string | null | undefined): string | null {
  if (!path) return null
  // Never store query strings — they can carry personal data.
  const clean = path.split('?')[0]?.split('#')[0] ?? ''
  if (!clean.startsWith('/')) return null

  // Record the *section*, never a record identifier. A path such as
  // /admin/applications/cm123 would otherwise link one analytics row to one
  // applicant, which is exactly the association this system refuses to build.
  const segments = clean.split('/').filter(Boolean)
  if (segments[0] === 'portal') return '/portal'
  if (segments[0] === 'admin') {
    return segments.length > 1 ? `/admin/${segments[1]}` : '/admin'
  }

  return clean.slice(0, 180)
}
