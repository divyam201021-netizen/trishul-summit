import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Flag,
  Mail,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { hasPermission, PERMISSIONS, type Permission } from '@/lib/auth/permissions'
import { getEventConfig } from '@/lib/config'
import { dashboardCounts, recentApplicationActivity } from '@/lib/applications/queries'
import { allocationOverview, committeeCount, publishedScheduleCount } from '@/lib/content/queries'
import { mailConfigured, mailStatusLabel } from '@/lib/mail/transport'
import { providerStatus } from '@/lib/payments'
import { statusMeta } from '@/lib/registration/status'
import { formatDateTime } from '@/lib/utils'
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
  StatusBadge,
} from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { PendingContent } from '@/components/ui/placeholder'

/**
 * Organizer dashboard.
 *
 * Answers the three questions an organizer opens this screen to ask:
 * what needs attention, is anything misconfigured, and what changed recently.
 * Numbers are real counts from the database — this platform never displays a
 * statistic it has not measured.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin()
  const [config, counts, activity, allocation, committeeTotal, scheduleTotal] = await Promise.all([
    getEventConfig(),
    dashboardCounts(),
    recentApplicationActivity(10),
    allocationOverview(),
    committeeCount(),
    publishedScheduleCount(),
  ])

  const payment = providerStatus()
  const mailLive = mailConfigured()
  const can = (permission: Permission) => hasPermission(admin.permissions, permission)

  const needsAttention = [
    counts.statusCounts.ACTION_REQUIRED ?? 0,
    counts.statusCounts.SUBMITTED ?? 0,
    counts.statusCounts.UNDER_REVIEW ?? 0,
  ].reduce((total, value) => total + value, 0)

  const blocking: { tone: 'warning' | 'error'; title: string; body: React.ReactNode; href?: string; cta?: string }[] = []

  if (committeeTotal === 0) {
    blocking.push({
      tone: 'error',
      title: 'No committees exist yet',
      body: 'Participants cannot record committee preferences until at least one committee row exists.',
      href: '/admin/committees',
      cta: 'Create a committee',
    })
  }
  if (counts.usesPlaceholderCommittees) {
    blocking.push({
      tone: 'warning',
      title: `${counts.placeholderCommittees} committee${counts.placeholderCommittees === 1 ? '' : 's'} still marked as placeholder`,
      body: 'Placeholder committees publish as “[COMMITTEE NAME — TBD] / Committee information coming soon”. That is honest, but participants cannot make a meaningful choice until the real list is published.',
      href: '/admin/committees',
      cta: 'Publish committee detail',
    })
  }
  if (!config.isSet('event.dateSummary') && !config.isSet('event.startDate')) {
    blocking.push({
      tone: 'warning',
      title: 'The event date is still unpublished',
      body: 'Public pages show [EVENT DATE — TBD] and session times stay hidden until a date and time zone exist.',
      href: '/admin/settings',
      cta: 'Add date details',
    })
  }
  if (!config.isSet('event.timeZone')) {
    blocking.push({
      tone: 'warning',
      title: 'No canonical time zone',
      body: 'Session times are never rendered without a time zone, so the schedule cannot display times yet.',
      href: '/admin/settings',
      cta: 'Set the time zone',
    })
  }
  if (!mailLive) {
    blocking.push({
      tone: 'warning',
      title: 'Email delivery is not configured',
      body: 'Every message is recorded in the delivery log instead of being sent. Participants will not receive confirmation emails until SMTP is configured.',
      href: '/admin/settings',
      cta: 'Review mail settings',
    })
  }
  if (!payment.configured) {
    blocking.push({
      tone: 'warning',
      title: 'Payment is not configured',
      body: 'Checkout stays disabled and the portal shows [PAYMENT DETAILS — TBD]. Applications can still be reviewed, allocated and confirmed.',
      href: '/admin/settings',
      cta: 'Fees & payment',
    })
  }
  if (blocking.length === 0) {
    blocking.push({
      tone: 'warning',
      title: 'Configuration is complete for review',
      body: 'Dates, time zone, committees and delivery are all configured. Nothing is blocking participants from registering.',
    })
  }

  const statusOrder = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'ACTION_REQUIRED',
    'ACCEPTED_PAYMENT_PENDING',
    'CONFIRMED',
    'WAITLISTED',
    'DECLINED',
    'WITHDRAWN',
  ] as const

  return (
    <div className="space-y-8">
      <SectionHeading
        as="h1"
        eyebrow={`Signed in as ${admin.roleName}`}
        title="Dashboard"
        description="Live counts from the application database, followed by everything that currently needs a decision from a human."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Applications"
          value={counts.total}
          hint="Submitted or further along. Drafts are excluded."
        />
        <Stat label="Awaiting decision" value={needsAttention} hint="Submitted, in review, or needing more information." />
        <Stat
          label="Confirmed"
          value={counts.statusCounts.CONFIRMED ?? 0}
          hint={counts.capacity != null ? `Committee capacity allocated so far: ${counts.capacity}` : 'No committee capacities published yet.'}
        />
        <Stat
          label="Registered accounts"
          value={counts.registeredParticipants}
          hint="Participants who have started an application."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Flag className="size-4 meta" aria-hidden="true" />
                Needs attention
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {blocking.map((item) => (
                <Alert key={item.title} tone={item.tone}>
                  <span className="font-medium">{item.title}</span>
                  <p className="mt-1 leading-relaxed">{item.body}</p>
                  {item.href && item.cta ? (
                    <p className="mt-2">
                      <Link href={item.href} className="link-underline font-medium">
                        {item.cta}
                      </Link>
                    </p>
                  ) : null}
                </Alert>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <ClipboardList className="size-4 meta" aria-hidden="true" />
                Applications by status
              </CardTitle>
            </CardHeader>
            <CardBody>
              {counts.total ? (
                <ul className="divide-y divide-ink-100">
                  {statusOrder.map((status) => {
                    const count = counts.statusCounts[status] ?? 0
                    return (
                      <li key={status} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <StatusBadge status={status} />
                        <span className="flex items-center gap-4">
                          <span className="text-sm meta">{statusMeta(status).explanation}</span>
                          <span className="font-display text-lg text-ink-900 tabular-nums">{count}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={<EMPTY_STATE_ICONS.noResults className="size-5" aria-hidden="true" />}
                  title="No applications yet"
                  description="As soon as someone submits an application it appears here with its full review trail. The public registration page is live now."
                  action={
                    <LinkButton href="/register" variant="secondary" size="sm">
                      Open the registration page
                    </LinkButton>
                  }
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <CalendarClock className="size-4 meta" aria-hidden="true" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardBody>
              {activity.length ? (
                <ul className="divide-y divide-ink-100">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={entry.toStatus} />
                        <Link
                          href={`/admin/applications/${entry.application.id}`}
                          className="link-underline font-mono text-xs text-brand-700"
                        >
                          {entry.application.reference}
                        </Link>
                        {entry.publicNote ? <span className="text-sm text-ink-600">{entry.publicNote}</span> : null}
                      </span>
                      <span className="text-xs meta">
                        {formatDateTime(entry.createdAt)} · {entry.actor?.name ?? 'system'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-600">
                  No status changes have been recorded yet. Every change an organizer makes appears here with the time and
                  the person who made it.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Programme status</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-600">Committees</dt>
                  <dd className="font-display text-lg text-ink-900 tabular-nums">{committeeTotal}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-600">Published sessions</dt>
                  <dd className="font-display text-lg text-ink-900 tabular-nums">{scheduleTotal}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-600">FAQ entries</dt>
                  <dd className="meta">Managed under Content</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                {can(PERMISSIONS.committeesManage) ? (
                  <LinkButton href="/admin/committees" variant="secondary" size="sm">
                    <Users className="size-3.5" aria-hidden="true" />
                    Committees
                  </LinkButton>
                ) : null}
                {can(PERMISSIONS.scheduleManage) ? (
                  <LinkButton href="/admin/schedule" variant="secondary" size="sm">
                    <CalendarClock className="size-3.5" aria-hidden="true" />
                    Schedule
                  </LinkButton>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Allocation load</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {allocation.length ? (
                <ul className="space-y-3 text-sm">
                  {allocation.map((row) => (
                    <li key={row.committee.id} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-ink-800">
                          {row.committee.name ?? (
                            <span className="font-mono text-xs text-warning-700">[COMMITTEE NAME — TBD]</span>
                          )}
                        </span>
                        <span className="text-xs meta tabular-nums">
                          {row.assigned}
                          {row.capacity != null ? ` / ${row.capacity}` : ' allocated'}
                        </span>
                      </div>
                      <p className="text-xs meta">
                        {row.preferences} preference{row.preferences === 1 ? '' : 's'} · {row.waitlist} waitlisted
                        {row.remaining != null ? ` · ${row.remaining} seats remaining` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-600">No committees to allocate against yet.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Delivery & payment</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-ink-600">
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                {mailLive ? (
                  <>Mail transport connected: {mailStatusLabel()}.</>
                ) : (
                  <>
                    No mail transport configured. Messages are recorded with status “queued” in the delivery log — they are
                    not sent. <Link href="/admin/settings" className="underline underline-offset-2">Configure SMTP</Link>.
                  </>
                )}
              </p>
              <p className="flex items-start gap-2">
                <CreditCard className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                {payment.configured ? (
                  <>Payment provider configured: {payment.label}.</>
                ) : (
                  <>Payment is not configured. Checkout is disabled and participants see [PAYMENT DETAILS — TBD]. Manual reconciliation is available on an application.</>
                )}
              </p>
              {can(PERMISSIONS.paymentsView) ? (
                <LinkButton href="/admin/payments" variant="secondary" size="sm">
                  Payments
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </LinkButton>
              ) : null}
            </CardBody>
          </Card>

          <PendingContent title="Analytics are aggregate only">
            Interaction events are stored without names, emails, references or free text. Reports show where people drop
            off, never who they are.
            {can(PERMISSIONS.reportsView) ? (
              <>
                {' '}
                <Link href="/admin/reports" className="underline underline-offset-2">
                  Open reports
                </Link>
                .
              </>
            ) : null}
          </PendingContent>

          {counts.paymentCounts.succeeded || counts.paymentCounts.manually_verified ? (
            <Card>
              <CardBody className="space-y-2 text-sm text-ink-600">
                <p className="flex items-center gap-2 font-medium text-ink-800">
                  <BadgeCheck className="size-4 text-success-600" aria-hidden="true" />
                  Settled payments
                </p>
                <p>
                  {counts.paymentCounts.succeeded ?? 0} provider-confirmed,{' '}
                  {counts.paymentCounts.manually_verified ?? 0} manually reconciled.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody className="space-y-3 text-sm text-ink-600">
              <p className="flex items-center gap-2 font-medium text-ink-800">
                <TriangleAlert className="size-4 text-warning-600" aria-hidden="true" />
                Permission boundary
              </p>
              <p>
                You are signed in as {admin.roleName}. Destinations and tools you do not have permission to use are not
                shown — and are refused server-side even if the URL is typed directly.
              </p>
              <div className="flex flex-wrap gap-2">
                {admin.permissions.slice(0, 6).map((permission) => (
                  <Badge key={permission} tone="outline">
                    {permission}
                  </Badge>
                ))}
                {admin.permissions.length > 6 ? <Badge tone="outline">+{admin.permissions.length - 6} more</Badge> : null}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
