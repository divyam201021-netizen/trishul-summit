import { NextResponse } from 'next/server'
import { applyProviderEvent, getPaymentProvider, providerStatus } from '@/lib/payments'
import { rateLimit } from '@/lib/security/request'

/**
 * Payment provider webhook.
 *
 * Two properties matter here, and both are implemented rather than promised:
 *  • authenticity — the payload is verified through the provider adapter's
 *    signature check before anything is read, and the raw body is used exactly
 *    as received so a signature cannot be invalidated by re-serialisation;
 *  • idempotency — `applyProviderEvent` keys on a unique provider event id, so
 *    the retries every provider sends are recorded once and ignored afterwards.
 *
 * Until a provider is configured this route refuses politely instead of
 * pretending to accept payments: `[PAYMENT DETAILS — TBD]`.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const status = providerStatus()
  if (!status.configured) {
    return NextResponse.json(
      {
        received: false,
        reason: 'no_provider_configured',
        message: 'Payment is not configured. [PAYMENT DETAILS — TBD]',
      },
      { status: 503 },
    )
  }

  const ipKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = rateLimit(`payments:webhook:${ipKey}`, 120, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ received: false, reason: 'rate_limited' }, { status: 429 })
  }

  const rawBody = await request.text()

  let event
  try {
    event = await getPaymentProvider().verifyWebhook(request.headers, rawBody)
  } catch {
    // Signature failures are expected traffic on a public endpoint. Nothing about
    // the payload or the reason is echoed back.
    return NextResponse.json({ received: false, reason: 'signature_verification_failed' }, { status: 400 })
  }

  try {
    const result = await applyProviderEvent(event)
    return NextResponse.json(
      { received: true, applied: result.applied, reason: result.reason ?? null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    // Ask the provider to retry rather than confirming receipt of something we
    // could not record.
    return NextResponse.json({ received: false, reason: 'processing_failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Payment webhooks are delivered by the provider over POST.' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
