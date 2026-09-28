import Link from 'next/link'
import { CreditCard, Filter, ShieldCheck, TriangleAlert } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/client'
import { PAYMENT_STATUSES, PAYMENT_STATUS_META, providerStatus, type PaymentStatus } from '@/lib/payments'
import { formatDateTime, formatMoney, pluralize } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EMPTY_STATE_ICONS,
  SectionHeading,
  Stat,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { Field, NativeSelect } from '@/components/ui/form'
import { PendingContent } from '@/components/ui/placeholder'

/**
 * Payments & reconciliation.
 *
 * Payment is intentionally inactive until a provider, fee, method and refund
 * policy are confirmed. This screen therefore leads with configuration state
 * rather than a checkout button, and it shows the provider event log — the
 * evidence that duplicate callbacks are ignored rather than double-counted.
 */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const admin = await requireAdmin(PERMISSIONS.paymentsView)
  const params = await searchParams
  const status = (params.status ?? 'all') as PaymentStatus | 'all'

  const where = status === 'all' ? {} : { status }
  const [payments, grouped, events] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        application: {
          select: {
            id: true,
            reference: true,
            status: true,
            participant: { select: { fullName: true, email: true, timeZone: true } },
          },
        },
        // Reconciliation trail: who verified or adjusted this payment, when.
        actions: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } },
      },
    }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.paymentEvent.findMany({ orderBy: { receivedAt: 'desc' }, take: 20 }),
  ])

  const provider = providerStatus()
  const counts: Record<string, number> = {}
  for (const row of grouped) counts[row.status] = row._count._all

  const settled = (counts.succeeded ?? 0) + (counts.manually_verified ?? 0)
  const outstanding = counts.pending ?? 0
  const canManage = hasPermission(admin.permissions, PERMISSIONS.paymentsManage)

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Finance"
        title="Payments & reconciliation"
        description="Provider state, money actually collected, and the manual reconciliation trail for transfers."
      />

      {!provider.configured ? (
        <Alert tone="warning" title="No payment provider is configured — checkout is disabled">
          Participants see <span className="font-mono text-xs">[PAYMENT DETAILS — TBD]</span> and no payment is requested
          anywhere in the registration flow. Card details are never collected by this platform in any configuration.
        </Alert>
      ) : (
        <Alert tone="success" title={`Provider configured: ${provider.label}`}>
          Provider callbacks are verified and processed idempotently — a replayed webhook is recorded once and ignored.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Settled payments" value={settled} hint="Provider-confirmed or manually reconciled." />
        <Stat label="Pending verification" value={outstanding} hint="Provider has not confirmed these yet." />
        <Stat label="Failed" value={counts.failed ?? 0} hint="No money was taken." />
        <Stat label="Refunded" value={counts.refunded ?? 0} hint="Handled under the refund policy once published." />
      </div>

      <Card>
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <Field label="Payment state" className="min-w-56">
              <NativeSelect name="status" defaultValue={status}>
                <option value="all">Any state</option>
                {PAYMENT_STATUSES.map((state) => (
                  <option key={state} value={state}>
                    {PAYMENT_STATUS_META[state].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-ink-900 px-5 text-sm font-medium text-ink-50 transition-colors hover:bg-ink-800"
            >
              <Filter className="size-4" aria-hidden="true" />
              Apply
            </button>
            {status !== 'all' ? (
              <Link href="/admin/payments" className="link-underline text-sm text-brand-700">
                Clear filter
              </Link>
            ) : null}
          </form>
        </CardBody>
      </Card>

      {payments.length ? (
        <TableWrap>
          <caption className="sr-only">Payments with applicant, amount, state and reconciliation trail</caption>
          <thead>
            <tr>
              <Th>Applicant</Th>
              <Th>Application</Th>
              <Th>Amount</Th>
              <Th>State</Th>
              <Th>Recorded</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const meta = PAYMENT_STATUS_META[payment.status as PaymentStatus] ?? PAYMENT_STATUS_META.not_configured
              return (
                <tr key={payment.id}>
                  <Td>
                    <span className="block text-ink-900">{payment.application.participant.fullName}</span>
                    <span className="block text-xs meta">{payment.application.participant.email}</span>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/applications/${payment.application.id}`}
                      className="link-underline font-mono text-xs text-brand-700"
                    >
                      {payment.application.reference}
                    </Link>
                  </Td>
                  <Td className="tabular-nums">
                    {formatMoney(payment.amountMinor, payment.currency) ?? (
                      <span className="font-mono text-2xs text-warning-700">[AMOUNT — TBD]</span>
                    )}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        meta.tone === 'positive'
                          ? 'positive'
                          : meta.tone === 'negative'
                            ? 'negative'
                            : meta.tone === 'warning'
                              ? 'warning'
                              : 'outline'
                      }
                    >
                      {meta.label}
                    </Badge>
                    <span className="mt-1 block text-xs meta">{meta.explanation}</span>
                  </Td>
                  <Td className="text-xs meta">
                    {formatDateTime(payment.createdAt)}
                    {payment.verifiedAt ? <span className="block">verified {formatDateTime(payment.verifiedAt)}</span> : null}
                  </Td>
                  <Td className="text-xs meta">
                    {payment.actions.length
                      ? payment.actions.map((action) => (
                          <span key={action.id} className="block">
                            {action.action.replace(/_/g, ' ')}
                            {action.actor?.name ? ` · ${action.actor.name}` : ''}
                            {' · '}
                            {formatDateTime(action.createdAt)}
                          </span>
                        ))
                      : 'No manual action recorded'}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState
          icon={<EMPTY_STATE_ICONS.noResults className="size-5" aria-hidden="true" />}
          title={status === 'all' ? 'No payment records yet' : 'No payments in this state'}
          description={
            status === 'all'
              ? 'Nothing has been charged or recorded. Once a provider is configured, or you reconcile a transfer manually from an application, records appear here with their full trail.'
              : 'Try another state, or clear the filter to see everything.'
          }
          action={status !== 'all' ? <Link href="/admin/payments" className="link-underline text-sm text-brand-700">Clear filter</Link> : null}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <ShieldCheck className="size-4 meta" aria-hidden="true" />
              Provider event log
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-600">
              Every verified callback is stored with a unique provider event id. {pluralize(events.length, 'event')} shown
              here — duplicates are rejected before they can change a payment.
            </p>
            {events.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {events.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-ink-700">{event.providerEventId}</span>
                      <span className="block text-xs meta">
                        {event.type} · {event.paymentId ? 'matched to a payment' : 'no matching payment reference'}
                      </span>
                    </span>
                    <span className="text-xs meta">{formatDateTime(event.receivedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm meta">
                No provider callbacks have been received. That is expected while payment is unconfigured.
              </p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {canManage ? (
            <PendingContent title="Manual reconciliation happens on the application">
              Record a bank transfer, verify a receipt or correct a payment state from the applicant&apos;s page, where the
              amount, currency, note and your name are captured together. Open an application from the queue to reconcile.
            </PendingContent>
          ) : (
            <PendingContent title="Read-only access">
              Your role can view payment state but not change it. Ask a finance account or a director to reconcile a
              payment.
            </PendingContent>
          )}

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <TriangleAlert className="size-4 meta" aria-hidden="true" />
                What this screen will never do
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm leading-relaxed text-ink-600">
              <p>It will not charge anyone, or retry a failed charge automatically.</p>
              <p>It will not store card numbers, CVV codes or bank credentials — only provider references.</p>
              <p>It will not mark a payment as settled from an unverified callback.</p>
              <p className="flex items-center gap-2 pt-1 text-xs meta">
                <CreditCard className="size-3.5" aria-hidden="true" />
                Refund handling is defined by the refund policy once the organizing committee publishes it.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
