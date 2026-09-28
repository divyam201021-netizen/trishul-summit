import Link from 'next/link'
import { Download, Filter, Lock, Search } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { listApplicationsForAdmin } from '@/lib/applications/queries'
import { listCommittees } from '@/lib/content/queries'
import { APPLICATION_STATUSES, statusMeta } from '@/lib/registration/status'
import { PAYMENT_STATUS_META } from '@/lib/payments'
import { formatDateTime, pluralize } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  EmptyState,
  EMPTY_STATE_ICONS,
  SectionHeading,
  StatusBadge,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Field, Input, NativeSelect } from '@/components/ui/form'

/**
 * Application queue.
 *
 * Filters are a plain GET form so a specific view can be bookmarked and shared
 * inside the committee, and so the page works with JavaScript disabled.
 * Personal data is only shown to accounts holding `applications.sensitive`;
 * reviewers without it see references and decisions, not contact details.
 */
export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    committee?: string
    payment?: string
    sort?: string
    page?: string
  }>
}) {
  const admin = await requireAdmin(PERMISSIONS.applicationsView)
  const params = await searchParams
  const canSeeSensitive = hasPermission(admin.permissions, PERMISSIONS.applicationsSensitive)
  const canExport = hasPermission(admin.permissions, PERMISSIONS.applicationsExport)

  const page = Number(params.page ?? 1) || 1
  const [result, committees] = await Promise.all([
    listApplicationsForAdmin({
      q: params.q,
      status: params.status,
      committee: params.committee,
      payment: params.payment,
      sort: (params.sort as 'submitted' | 'reference' | 'status' | 'name' | undefined) ?? 'submitted',
      page,
    }),
    listCommittees(),
  ])

  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][],
  )

  const exportHref = `/admin/applications/export?${query.toString()}`
  const activeFilters = [params.q, params.status, params.committee, params.payment].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          as="h1"
          eyebrow="Applications"
          title="Application queue"
          description="Every submitted application, newest first, with its decision trail intact."
        />
        {canExport ? (
          <LinkButton href={exportHref} variant="secondary" size="sm">
            <Download className="size-3.5" aria-hidden="true" />
            Export view (CSV)
          </LinkButton>
        ) : null}
      </div>

      {!canSeeSensitive ? (
        <Alert tone="neutral" title="Personal data is hidden for your role">
          Your account has <span className="font-mono text-xs">applications.view</span> but not{' '}
          <span className="font-mono text-xs">applications.sensitive</span>. You can assess applications and record
          decisions; names, email addresses and institutions stay hidden until your role needs them.
        </Alert>
      ) : null}

      <Card>
        <CardBody>
          <form method="get" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Search" hint="Reference, name, email or institution">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <Input name="q" defaultValue={params.q ?? ''} className="pl-9" placeholder="TRI-… or name" />
              </div>
            </Field>

            <Field label="Status">
              <NativeSelect name="status" defaultValue={params.status ?? 'all'}>
                <option value="all">Any status</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusMeta(status).label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Committee">
              <NativeSelect name="committee" defaultValue={params.committee ?? 'all'}>
                <option value="all">Any committee</option>
                {committees.map((committee) => (
                  <option key={committee.id} value={committee.id}>
                    {committee.name ?? `Placeholder ${committee.displayOrder + 1}`}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Payment">
              <NativeSelect name="payment" defaultValue={params.payment ?? 'all'}>
                <option value="all">Any payment state</option>
                {Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Sort">
              <NativeSelect name="sort" defaultValue={params.sort ?? 'submitted'}>
                <option value="submitted">Newest submission</option>
                <option value="reference">Reference</option>
                <option value="status">Status</option>
              </NativeSelect>
            </Field>

            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-5">
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-ink-900 px-5 text-sm font-medium text-ink-50 transition-colors hover:bg-ink-800"
              >
                <Filter className="size-4" aria-hidden="true" />
                Apply filters
              </button>
              {activeFilters ? (
                <Link href="/admin/applications" className="link-underline text-sm text-brand-700">
                  Clear {activeFilters === 1 ? 'filter' : 'filters'}
                </Link>
              ) : null}
            </div>
          </form>
        </CardBody>
      </Card>

      <p className="text-sm text-ink-600">
        {result.total === 0
          ? 'No applications match this view.'
          : `${pluralize(result.total, 'application')} · page ${result.page} of ${result.pageCount}`}
      </p>

      {result.rows.length ? (
        <>
          <TableWrap>
            <caption className="sr-only">
              Applications, with reference, applicant, institution, submission time, status and allocation
            </caption>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Applicant</Th>
                <Th>Institution</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th>Committee</Th>
                <Th>Payment</Th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                const paymentMeta = row.payments[0]
                  ? PAYMENT_STATUS_META[row.payments[0].status as keyof typeof PAYMENT_STATUS_META]
                  : null
                return (
                  <tr key={row.id} className="transition-colors hover:bg-paper-sunk/60">
                    <Td>
                      <Link href={`/admin/applications/${row.id}`} className="link-underline font-mono text-xs text-brand-700">
                        {row.reference}
                      </Link>
                    </Td>
                    <Td>
                      {canSeeSensitive ? (
                        <>
                          <span className="block text-ink-900">{row.participant.fullName}</span>
                          <span className="block text-xs meta">{row.participant.email}</span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs meta">
                          <Lock className="size-3" aria-hidden="true" />
                          Restricted
                        </span>
                      )}
                    </Td>
                    <Td>{canSeeSensitive ? (row.participant.institution ?? '—') : '—'}</Td>
                    <Td className="whitespace-nowrap text-xs text-ink-600">
                      {row.submittedAt ? formatDateTime(row.submittedAt, row.participant.timeZone) : 'Draft'}
                    </Td>
                    <Td>
                      <StatusBadge status={row.status} />
                    </Td>
                    <Td>
                      {row.assignedCommittee ? (
                        row.assignedCommittee.name ?? (
                          <span className="font-mono text-2xs text-warning-700">[NAME — TBD]</span>
                        )
                      ) : (
                        <span className="text-xs meta">Not allocated</span>
                      )}
                    </Td>
                    <Td>
                      {paymentMeta ? (
                        <Badge
                          tone={
                            paymentMeta.tone === 'positive'
                              ? 'positive'
                              : paymentMeta.tone === 'negative'
                                ? 'negative'
                                : paymentMeta.tone === 'warning'
                                  ? 'warning'
                                  : 'neutral'
                          }
                        >
                          {paymentMeta.label}
                        </Badge>
                      ) : (
                        <span className="text-xs meta">No record</span>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>

          {result.pageCount > 1 ? (
            <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3">
              {result.page > 1 ? (
                <LinkButton
                  href={`/admin/applications?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page - 1) }).toString()}`}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </LinkButton>
              ) : null}
              <span className="text-sm text-ink-600">
                Page {result.page} of {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <LinkButton
                  href={`/admin/applications?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page + 1) }).toString()}`}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </LinkButton>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<EMPTY_STATE_ICONS.noResults className="size-5" aria-hidden="true" />}
          title={activeFilters ? 'No applications match these filters' : 'The queue is empty'}
          description={
            activeFilters
              ? 'Try widening the filters. Nothing has been hidden from you by the platform.'
              : 'Nothing has been submitted yet. Applications appear here the moment a participant submits one.'
          }
          action={activeFilters ? <LinkButton href="/admin/applications" variant="secondary">Clear filters</LinkButton> : null}
        />
      )}
    </div>
  )
}
