import Link from 'next/link'
import { BarChart3, Mail, TrendingUp, Users } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/client'
import { allocationOverview } from '@/lib/content/queries'
import { APPLICATION_STATUSES, statusMeta } from '@/lib/registration/status'
import { PAYMENT_STATUSES, PAYMENT_STATUS_META } from '@/lib/payments'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { pluralize } from '@/lib/utils'
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
import { PendingContent } from '@/components/ui/placeholder'

/**
 * Reports.
 *
 * Aggregate only, by construction. Analytics rows contain an allow-listed event
 * name, a canonical path, a cookie-less session id and enumerated properties —
 * never a name, email, reference or free-text answer. Where a number would
 * require individual-level data, the report simply does not exist.
 */
export default async function AdminReportsPage() {
  await requireAdmin(PERMISSIONS.reportsView)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    applications,
    drafts,
    participants,
    byStatus,
    byCountry,
    byInstitution,
    preferences,
    payments,
    mail,
    eventsByName,
    topPaths,
    unresolvedFaq,
    committees,
    sessions,
  ] = await Promise.all([
    prisma.application.count({ where: { status: { not: 'DRAFT' } } }),
    prisma.application.count({ where: { status: 'DRAFT' } }),
    prisma.participant.count(),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.participant.groupBy({ by: ['country'], _count: { _all: true } }),
    prisma.participant.groupBy({ by: ['institution'], _count: { _all: true } }),
    allocationOverview(),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.emailMessage.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.analyticsEvent.groupBy({
      by: ['name'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['path'],
      where: { createdAt: { gte: since }, path: { not: null } },
      _count: { _all: true },
    }),
    prisma.fAQItem.count({ where: { answer: null } }),
    prisma.committee.count(),
    prisma.scheduleSession.count({ where: { published: true } }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) statusCounts[row.status.toUpperCase()] = row._count._all
  const paymentCounts: Record<string, number> = {}
  for (const row of payments) paymentCounts[row.status] = row._count._all
  const mailCounts: Record<string, number> = {}
  for (const row of mail) mailCounts[row.status] = row._count._all

  const topCountries = [...byCountry].filter((row) => row.country).sort((a, b) => b._count._all - a._count._all).slice(0, 8)
  const topInstitutions = [...byInstitution].filter((row) => row.institution).sort((a, b) => b._count._all - a._count._all).slice(0, 8)
  const engagement = [...eventsByName].sort((a, b) => b._count._all - a._count._all)
  // Private surfaces are excluded from reporting: a "most viewed page" list must
  // never reveal that a participant visited their portal.
  const PRIVATE_PREFIXES = ['/portal', '/admin', '/sign-in', '/register', '/api']
  const paths = [...topPaths]
    .filter((row) => row.path && !PRIVATE_PREFIXES.some((prefix) => row.path!.startsWith(prefix)))
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 10)

  const submitted = applications
  const confirmed = statusCounts.CONFIRMED ?? 0
  const startedButNotSubmitted = drafts
  const conversion = participants ? Math.round((submitted / participants) * 100) : 0

  const demand = preferences
    .map((row) => ({
      name: row.committee.name ?? `Placeholder ${row.committee.displayOrder + 1}`,
      preferences: row.preferences,
      capacity: row.capacity,
      assigned: row.assigned,
      remaining: row.remaining,
    }))
    .sort((a, b) => b.preferences - a.preferences)

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Insight"
        title="Reports"
        description="Aggregate figures from the live database plus privacy-preserving interaction counts from the last 30 days."
      />

      <Alert tone="neutral" title="What is deliberately missing">
        There are no per-participant timelines, no session-level replay and no cross-site identifiers, because the platform
        does not collect them. If a metric would require identifying an individual, it is not on this page.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Submitted applications" value={submitted} hint={`${drafts} draft${drafts === 1 ? '' : 's'} not yet submitted`} />
        <Stat label="Registered accounts" value={participants} hint="Every account that started an application" />
        <Stat label="Confirmed places" value={confirmed} hint={committees ? `Across ${pluralize(committees, 'committee')}` : 'No committees yet'} />
        <Stat label="Submission rate" value={`${conversion}%`} hint="Accounts that went on to submit" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <TrendingUp className="size-4 meta" aria-hidden="true" />
              Application funnel by status
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-ink-100">
              {APPLICATION_STATUSES.filter((status) => status !== 'DRAFT').map((status) => {
                const count = statusCounts[status] ?? 0
                const share = submitted ? Math.round((count / submitted) * 100) : 0
                return (
                  <li key={status} className="space-y-1.5 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-700">{statusMeta(status).label}</span>
                      <span className="text-ink-900 tabular-nums">
                        {count}
                        <span className="ml-2 text-xs meta">{share}%</span>
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200"
                      role="img"
                      aria-label={`${count} of ${submitted} applications are ${statusMeta(status).label}`}
                    >
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-xs leading-relaxed meta">
              {startedButNotSubmitted > 0
                ? `${pluralize(startedButNotSubmitted, 'draft')} never reached submission. Drafts are invisible to every other participant and to reviewers.`
                : 'No abandoned drafts. Every account that started an application submitted it.'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <BarChart3 className="size-4 meta" aria-hidden="true" />
              Committee demand vs capacity
            </CardTitle>
          </CardHeader>
          <CardBody>
            {demand.length ? (
              <TableWrap className="border-0">
                <caption className="sr-only">Preference demand compared with capacity for each committee</caption>
                <thead>
                  <tr>
                    <Th>Committee</Th>
                    <Th>1st–3rd preferences</Th>
                    <Th>Allocated</Th>
                    <Th>Capacity</Th>
                  </tr>
                </thead>
                <tbody>
                  {demand.map((row) => (
                    <tr key={row.name}>
                      <Td className="text-ink-800">{row.name}</Td>
                      <Td className="tabular-nums">{row.preferences}</Td>
                      <Td className="tabular-nums">{row.assigned}</Td>
                      <Td className="tabular-nums">
                        {row.capacity != null ? (
                          row.capacity
                        ) : (
                          <span className="font-mono text-2xs text-warning-700">[CAPACITY — TBD]</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState
                icon={<EMPTY_STATE_ICONS.noCommittees className="size-5" aria-hidden="true" />}
                title="No committee demand recorded yet"
                description="Demand appears here as applicants record preferences. Nothing is estimated."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Users className="size-4 meta" aria-hidden="true" />
              Reach
            </CardTitle>
          </CardHeader>
          <CardBody className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="eyebrow meta">Top countries / regions</p>
              {topCountries.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {topCountries.map((row) => (
                    <li key={row.country} className="flex items-center justify-between gap-3">
                      <span className="text-ink-700">{row.country}</span>
                      <span className="text-ink-900 tabular-nums">{row._count._all}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm meta">No country data yet.</p>
              )}
            </div>
            <div>
              <p className="eyebrow meta">Top institutions</p>
              {topInstitutions.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {topInstitutions.map((row) => (
                    <li key={row.institution} className="flex items-center justify-between gap-3">
                      <span className="truncate text-ink-700">{row.institution}</span>
                      <span className="text-ink-900 tabular-nums">{row._count._all}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm meta">No institution data yet.</p>
              )}
            </div>
            <p className="text-xs leading-relaxed meta sm:col-span-2">
              Counts are aggregates only — this page never lists which applicant belongs to which institution, because that
              combines two identifying facts.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Mail className="size-4 meta" aria-hidden="true" />
              Payments & delivery
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <p className="eyebrow meta">Payments</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {PAYMENT_STATUSES.map((status) => (
                  <li key={status}>
                    <Badge tone="outline">
                      {PAYMENT_STATUS_META[status].label} · {paymentCounts[status] ?? 0}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed meta">
                No revenue total is shown because no fee is configured. Inventing a figure from unknown pricing would be a
                reporting error, not a metric.
              </p>
            </div>
            <div>
              <p className="eyebrow meta">Email delivery</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {['sent', 'queued', 'failed'].map((status) => (
                  <li key={status}>
                    <Badge tone={status === 'failed' ? 'negative' : status === 'queued' ? 'warning' : 'positive'}>
                      {status} · {mailCounts[status] ?? 0}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed meta">
                “Queued” means recorded but not delivered — usually because no mail transport is configured. See the{' '}
                <Link href="/admin/communications" className="underline underline-offset-2">
                  delivery log
                </Link>
                .
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Interaction events (last 30 days)</CardTitle>
          </CardHeader>
          <CardBody>
            {engagement.length ? (
              <ul className="divide-y divide-ink-100">
                {ANALYTICS_EVENTS.map((name) => {
                  const row = engagement.find((entry) => entry.name === name)
                  const count = row?._count._all ?? 0
                  return (
                    <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="font-mono text-xs text-ink-700">{name}</span>
                      <span className="text-ink-900 tabular-nums">{count}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-600">
                No interaction events have been recorded yet. Events are aggregate only: an allow-listed name, a path and
                enumerated properties.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Most-viewed public pages</CardTitle>
          </CardHeader>
          <CardBody>
            {paths.length ? (
              <ul className="divide-y divide-ink-100">
                {paths.map((row) => (
                  <li key={row.path} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-mono text-xs text-ink-700">{row.path}</span>
                    <span className="text-ink-900 tabular-nums">{row._count._all}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-600">No page views recorded yet.</p>
            )}
            <p className="mt-3 text-xs leading-relaxed meta">
              Query strings are stripped before storage, so nothing personal can appear here even by accident. Portal and
              admin paths are excluded from reporting.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardBody className="space-y-2">
            <p className="eyebrow meta">Content readiness</p>
            <p className="text-sm text-ink-700">
              {unresolvedFaq === 0
                ? 'Every FAQ question has an answer.'
                : `${pluralize(unresolvedFaq, 'FAQ answer')} still to be published.`}
            </p>
            <p className="text-sm text-ink-700">
              {sessions === 0 ? 'No sessions are published yet.' : `${pluralize(sessions, 'session')} published.`}
            </p>
            <Link href="/admin/content" className="link-underline text-sm text-brand-700">
              Review content
            </Link>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <PendingContent title="No vanity metrics">
            This platform does not display seat counters, countdowns or “X people viewing now” widgets, and none of the
            figures above are extrapolated to look better than they are.
          </PendingContent>
        </div>
      </div>
    </div>
  )
}
