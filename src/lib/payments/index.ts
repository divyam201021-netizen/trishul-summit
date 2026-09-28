import { prisma } from '@/lib/db/client'
import { stringifyJson } from '@/lib/db/client'

/**
 * ============================================================================
 * PAYMENT ARCHITECTURE
 * ============================================================================
 * Payment is DELIBERATELY INACTIVE until a provider, fee and refund policy are
 * confirmed by the organizer. The abstraction below is what a real provider
 * plugs into; until then:
 *
 *   • checkout is hidden and `[PAYMENT DETAILS — TBD]` is shown instead
 *   • card details are never requested, collected or stored anywhere
 *   • only tokenised provider references plus verified provider events are
 *     persisted, and event processing is idempotent (`providerEventId` unique)
 */

export const PAYMENT_STATUSES = [
  'not_configured',
  'initiated',
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'manually_verified',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: 'neutral' | 'progress' | 'positive' | 'warning' | 'negative'; explanation: string }> = {
  not_configured: {
    label: 'Not configured — TBD',
    tone: 'neutral',
    explanation: 'Payment details have not been published by the organizing committee yet.',
  },
  initiated: { label: 'Awaiting payment', tone: 'progress', explanation: 'A payment session was opened but not completed.' },
  pending: { label: 'Pending verification', tone: 'warning', explanation: 'The provider has not confirmed this payment yet.' },
  succeeded: { label: 'Paid', tone: 'positive', explanation: 'Payment was confirmed by the payment provider.' },
  failed: { label: 'Failed', tone: 'negative', explanation: 'The payment did not complete. No money was taken.' },
  refunded: { label: 'Refunded', tone: 'neutral', explanation: 'Payment was refunded under the refund policy.' },
  manually_verified: {
    label: 'Verified manually',
    tone: 'positive',
    explanation: 'An organizer verified this payment against a bank or transfer record.',
  },
}

export interface ProviderStatus {
  configured: boolean
  provider: string | null
  /** Safe, participant-facing label. */
  label: string
}

export class PaymentNotConfiguredError extends Error {
  constructor() {
    super('Payment is not configured. [PAYMENT DETAILS — TBD]')
    this.name = 'PaymentNotConfiguredError'
  }
}

export interface VerifiedProviderEvent {
  providerEventId: string
  type: 'payment.succeeded' | 'payment.failed' | 'payment.pending' | 'payment.refunded'
  providerRef: string
  amountMinor?: number
  currency?: string
}

export interface PaymentProvider {
  key: string
  configured: boolean
  /** Returns a hosted checkout URL. Never accepts or stores card data itself. */
  createCheckout(input: { paymentId: string; amountMinor: number | null; currency: string | null; returnUrl: string }): Promise<{ url: string }>
  /** Verifies the provider signature and normalises the payload. */
  verifyWebhook(headers: Headers, rawBody: string): Promise<VerifiedProviderEvent>
  refund(input: { providerRef: string; amountMinor?: number | null }): Promise<{ ok: boolean; message?: string }>
}

const noopProvider: PaymentProvider = {
  key: 'none',
  configured: false,
  async createCheckout() {
    throw new PaymentNotConfiguredError()
  },
  async verifyWebhook() {
    throw new PaymentNotConfiguredError()
  },
  async refund() {
    return { ok: false, message: '[REFUND POLICY — TBD]' }
  },
}

/** Reads the provider from the environment. Unset => payments stay off. */
export function providerStatus(): ProviderStatus {
  const key = (process.env.PAYMENT_PROVIDER || '').trim()
  const secret = (process.env.PAYMENT_SECRET_KEY || '').trim()
  if (!key || !secret) {
    return { configured: false, provider: null, label: 'Payment not configured — [PAYMENT DETAILS — TBD]' }
  }
  return { configured: true, provider: key, label: `${key} (configured)` }
}

export function getPaymentProvider(): PaymentProvider {
  const status = providerStatus()
  if (!status.configured) return noopProvider
  // When a provider is configured, register it here (Stripe/Razorpay/custom).
  // The interface is intentionally provider-agnostic; implementations live in
  // ./providers/*.ts and are imported lazily so an unused SDK is never bundled.
  console.warn(`[payments] PAYMENT_PROVIDER=${status.provider} is set but no adapter is registered yet.`)
  return noopProvider
}

/** Derives the status a participant sees for their application. */
export function currentPaymentSummary(
  payments: { status: string; amountMinor: number | null; currency: string | null }[],
): { status: PaymentStatus; label: string; tone: string; explanation: string; amountMinor: number | null; currency: string | null } {
  const order: PaymentStatus[] = ['succeeded', 'manually_verified', 'refunded', 'pending', 'initiated', 'failed', 'not_configured']
  const latest = order
    .map((status) => payments.find((payment) => payment.status === status))
    .find((payment): payment is NonNullable<typeof payment> => Boolean(payment))

  const status = (latest?.status as PaymentStatus) ?? (providerStatus().configured ? 'not_configured' : 'not_configured')
  const meta = PAYMENT_STATUS_META[status] ?? PAYMENT_STATUS_META.not_configured
  return {
    status,
    label: meta.label,
    tone: meta.tone,
    explanation: meta.explanation,
    amountMinor: latest?.amountMinor ?? null,
    currency: latest?.currency ?? null,
  }
}

/**
 * Idempotent reconciliation of a verified provider event. Duplicate deliveries
 * (which every provider sends) are ignored via the unique `providerEventId`.
 */
export async function applyProviderEvent(event: VerifiedProviderEvent): Promise<{ applied: boolean; reason?: string }> {
  const existing = await prisma.paymentEvent.findUnique({ where: { providerEventId: event.providerEventId } })
  if (existing) return { applied: false, reason: 'duplicate' }

  const payment = await prisma.payment.findFirst({ where: { providerRef: event.providerRef } })

  const record = await prisma.paymentEvent.create({
    data: {
      providerEventId: event.providerEventId,
      type: event.type,
      paymentId: payment?.id ?? null,
      payloadJson: stringifyJson({ ...event }),
      processedAt: new Date(),
    },
  })

  if (!payment) {
    await prisma.paymentEvent.update({
      where: { id: record.id },
      data: { error: 'No matching payment reference' },
    })
    return { applied: false, reason: 'unknown_reference' }
  }

  const status: PaymentStatus =
    event.type === 'payment.succeeded'
      ? 'succeeded'
      : event.type === 'payment.failed'
        ? 'failed'
        : event.type === 'payment.refunded'
          ? 'refunded'
          : 'pending'

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      verifiedAt: status === 'succeeded' ? new Date() : payment.verifiedAt,
      refundedAt: status === 'refunded' ? new Date() : payment.refundedAt,
      failureReason: status === 'failed' ? 'Provider reported a failed payment.' : null,
    },
  })

  return { applied: true }
}
