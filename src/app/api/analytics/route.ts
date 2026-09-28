import { NextResponse } from 'next/server'
import { prisma, stringifyJson } from '@/lib/db/client'
import { hashWithSecret } from '@/lib/auth/crypto'
import { assertSameOrigin, clientIp, rateLimit, userAgent } from '@/lib/security/request'
import { canonicalPath, isAnalyticsEvent, sanitizeAnalyticsProps } from '@/lib/analytics/events'

/**
 * Analytics ingest.
 *
 * This endpoint is the only way an interaction reaches the database, and it is
 * deliberately unforgiving:
 *   • same-origin only, POST only;
 *   • the event name must be on the allow-list, or the request is dropped;
 *   • properties are passed through the allow-list sanitiser, which strips PII
 *     patterns (emails, phone-like strings, application references) and free text;
 *   • query strings are removed from paths;
 *   • the client is identified only by a salted hash of its IP, used for rate
 *     limiting and never joined to an account;
 *   • responses are always empty — no echo, no ids, nothing to scrape.
 */
export const dynamic = 'force-dynamic'

const RATE_LIMIT = 240
const WINDOW_MS = 60_000

export async function POST(request: Request) {
  if (!(await assertSameOrigin(request))) {
    return new NextResponse(null, { status: 403 })
  }

  // The analytics salt is deliberately separate from the session secret so the
  // analytics keyspace can be rotated (or discarded) without invalidating sessions.
  const salt = process.env.ANALYTICS_SALT || process.env.SESSION_SECRET || 'dev-secret'
  const ipHash = hashWithSecret(await clientIp(), salt)
  const limited = rateLimit(`analytics:${ipHash}`, RATE_LIMIT, WINDOW_MS)
  if (!limited.ok) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const body = payload as {
    name?: unknown
    props?: unknown
    path?: unknown
    sessionId?: unknown
    referrer?: unknown
  }

  // Unknown event names are dropped silently: a beacon is not a script channel.
  if (!isAnalyticsEvent(body.name)) {
    return new NextResponse(null, { status: 204 })
  }

  const eventName = body.name
  const props = sanitizeAnalyticsProps(
    eventName,
    typeof body.props === 'object' && body.props !== null ? (body.props as Record<string, unknown>) : {},
  )

  const path = canonicalPath(typeof body.path === 'string' ? body.path : null)

  // The session id is an opaque, cookie-less value: keep it opaque.
  const sessionId =
    typeof body.sessionId === 'string' && /^[a-z0-9]{8,32}$/i.test(body.sessionId) ? body.sessionId : null

  // Referrers are reduced to a host so a full URL (which can carry parameters)
  // is never stored.
  let referrer: string | null = null
  if (typeof body.referrer === 'string' && body.referrer.trim()) {
    const raw = body.referrer.trim().slice(0, 200)
    try {
      referrer = new URL(raw.includes('://') ? raw : `https://${raw}`).host.slice(0, 120)
    } catch {
      referrer = null
    }
  }

  const agent = (await userAgent()) ?? ''
  const deviceType = /iPad|Tablet|PlayBook|Silk/i.test(agent)
    ? 'tablet'
    : /Mobi|Android|iPhone|iPod/i.test(agent)
      ? 'mobile'
      : 'desktop'

  try {
    await prisma.analyticsEvent.create({
      data: {
        name: eventName,
        path,
        sessionId,
        propsJson: stringifyJson(props),
        referrer,
        deviceType,
      },
    })
  } catch {
    // Analytics must never surface an error to the visitor or the caller.
    return new NextResponse(null, { status: 204 })
  }

  return new NextResponse(null, { status: 204 })
}

export async function GET() {
  return NextResponse.json(
    { error: 'Analytics ingest accepts POST only, from same-origin pages.' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
