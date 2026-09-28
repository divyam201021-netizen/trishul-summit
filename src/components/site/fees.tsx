import Link from 'next/link'
import { BadgeDollarSign, Info, ShieldCheck } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle, KeyValue, Alert } from '@/components/ui/primitives'
import { Ph, Tbd } from '@/components/ui/placeholder'
import type { EventConfig } from '@/lib/config'
import { providerStatus } from '@/lib/payments'

/**
 * Fees are shown transparently and never invented. Because the PRD has not
 * finalised a fee, currency, refund policy or payment method, checkout stays
 * disabled and the section states exactly that.
 */
export function FeeSummary({ config, compact = false }: { config: EventConfig; compact?: boolean }) {
  const provider = providerStatus()
  const fee = config.text('fees.registrationFee')
  const currency = config.text('fees.currency')

  return (
    <Card>
      <CardHeader>
        <p className="eyebrow text-brand-700">Registration fee</p>
        <CardTitle className="font-display text-2xl">
          {fee ? (
            <>
              {fee}
              {currency ? <span className="ml-2 text-base meta">{currency}</span> : null}
            </>
          ) : (
            <span className="flex flex-wrap items-center gap-2 text-xl">
              <span className="text-ink-700">Fee:</span>
              <Tbd label="FEE" />
              {currency ? null : <Tbd label="CURRENCY" />}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-ink-600">
          {fee
            ? 'The fee below is published by the organizing committee and applies per participant.'
            : 'Payment details will be announced by the organizing committee. This page is updated as soon as they are confirmed.'}
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <dl className="divide-y divide-ink-100">
          <KeyValue label="Payment method">
            <Ph path="fees.paymentMethod" />
          </KeyValue>
          <KeyValue label="Refund policy">
            <Ph path="fees.refundPolicy" />
          </KeyValue>
          <KeyValue label="Waiver information">
            <Ph path="fees.waiverInformation" />
          </KeyValue>
          {!compact ? (
            <KeyValue label="What the fee includes">
              {config.list('fees.delegateFeeIncludes').length ? (
                <ul className="flex flex-col gap-1.5">
                  {config.list('fees.delegateFeeIncludes').map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent-500">
                        —
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <Ph path="fees.delegateFeeIncludes" />
              )}
            </KeyValue>
          ) : null}
          <KeyValue label="Payment status">
            <span className="inline-flex flex-wrap items-center gap-2">
              <span
                className="font-mono text-xs tracking-wide text-ink-600 uppercase"
                data-payment-status={provider.configured ? 'configured' : 'not-configured'}
              >
                {provider.configured ? 'Payment configured' : 'Not configured / TBD'}
              </span>
              {!provider.configured ? <Tbd label="PAYMENT DETAILS" /> : null}
            </span>
          </KeyValue>
        </dl>

        {provider.configured ? (
          <Alert tone="info" title="Payments are handled by a tokenised provider">
            You will never be asked for card details on this site. Checkout opens in the payment provider&apos;s own
            secure flow, and only the provider&apos;s reference is stored here.
          </Alert>
        ) : (
          <Alert
            tone="warning"
            title="Checkout is disabled until payment details are confirmed"
            icon={<ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          >
            <p>
              No card details are requested or stored anywhere on this platform. When the organizing committee
              publishes the fee, currency and refund policy, checkout will be enabled here.
            </p>
            <p className="mt-2">
              Questions about fees? <Link href="/contact" className="underline underline-offset-2">Contact the organizing committee</Link>.
            </p>
          </Alert>
        )}
      </CardBody>
    </Card>
  )
}

export function FeeFootnote() {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed meta">
      <BadgeDollarSign className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Fees, currency, refunds and waivers are configuration values. Nothing here is a placeholder price: an amount is
      shown only once the organizing committee publishes it.
    </p>
  )
}

export function PaymentNotice() {
  const provider = providerStatus()
  if (provider.configured) return null
  return (
    <p className="flex items-start gap-2 text-xs meta">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Payment is not configured, so no payment step is offered during registration.
    </p>
  )
}
