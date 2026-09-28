import Link from 'next/link'
import { Filter, ScrollText } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/client'
import { formatDateTime, pluralize } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  EmptyState,
  EMPTY_STATE_ICONS,
  SectionHeading,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect } from '@/components/ui/form'
import { LinkButton } from '@/components/ui/button'

/**
 * Audit log.
 *
 * Append-only by contract: nothing in the application updates or deletes these
 * rows. Two separate actor columns are denormalised (participant vs admin) and a
 * display label is stored with each entry so the trail survives account
 * deletion. IP addresses are stored only as salted hashes.
 */
const PAGE_SIZE = 50

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; actor?: string; page?: string }>
}) {
  await requireAdmin(PERMISSIONS.auditView)
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1) || 1)

  const where: Record<string, unknown> = {}
  if (params.action?.trim()) where.action = { contains: params.action.trim() }
  if (params.entityType && params.entityType !== 'all') where.entityType = params.entityType
  if (params.actor && params.actor !== 'all') where.actorType = params.actor

  const [events, total, entityTypes, actions] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.groupBy({ by: ['entityType'], _count: { _all: true } }),
    prisma.auditEvent.groupBy({ by: ['action'], _count: { _all: true } }),
  ])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const topActions = [...actions].sort((a, b) => b._count._all - a._count._all).slice(0, 8)

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Accountability"
        title="Audit log"
        description="Every consequential action: sign-ins, decisions, allocations, payment records, content changes and exports."
      />

      <Alert tone="neutral" title="Append-only and attributable">
        Entries cannot be edited or deleted from the application, and each one records who acted, what changed (before and
        after where relevant) and when. IP addresses are stored as salted hashes only.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody>
            <p className="eyebrow meta">Recorded actions</p>
            <p className="mt-2 font-display text-2xl text-ink-900 tabular-nums">{total}</p>
            <p className="mt-1 text-xs meta">Matching the current filter</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow meta">Entities</p>
            <p className="mt-2 text-sm text-ink-800">{pluralize(entityTypes.length, 'entity type')}</p>
            <p className="mt-1 text-xs meta">Applications, payments, settings, staff…</p>
          </CardBody>
        </Card>
        <Card className="sm:col-span-2">
          <CardBody>
            <p className="eyebrow meta">Most frequent actions</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {topActions.map((row) => (
                <li key={row.action}>
                  <Badge tone="outline">
                    {row.action} · {row._count._all}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <form method="get" className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Action" hint="Substring match, e.g. application or payment">
              <Input name="action" defaultValue={params.action ?? ''} placeholder="staff." />
            </Field>
            <Field label="Entity type">
              <NativeSelect name="entityType" defaultValue={params.entityType ?? 'all'}>
                <option value="all">Any entity</option>
                {entityTypes.map((row) => (
                  <option key={row.entityType} value={row.entityType}>
                    {row.entityType}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Actor">
              <NativeSelect name="actor" defaultValue={params.actor ?? 'all'}>
                <option value="all">Anyone</option>
                <option value="admin">Organizers</option>
                <option value="participant">Participants</option>
                <option value="system">System</option>
              </NativeSelect>
            </Field>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-ink-900 px-5 text-sm font-medium text-ink-50 transition-colors hover:bg-ink-800"
              >
                <Filter className="size-4" aria-hidden="true" />
                Filter
              </button>
              <Link href="/admin/audit" className="link-underline text-sm text-brand-700">
                Reset
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {events.length ? (
        <>
          <TableWrap>
            <caption className="sr-only">Audit events with actor, action, entity and time</caption>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Summary</Th>
                <Th>Change</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <Td className="whitespace-nowrap text-xs text-ink-600">{formatDateTime(event.createdAt)}</Td>
                  <Td className="text-xs">
                    <span className="block text-ink-800">{event.actorLabel ?? event.actorType}</span>
                    <span className="block font-mono text-2xs meta">{event.actorType}</span>
                  </Td>
                  <Td className="font-mono text-xs text-ink-700">{event.action}</Td>
                  <Td className="text-xs">
                    {event.entityType}
                    {event.entityId ? <span className="block font-mono text-2xs meta">{event.entityId}</span> : null}
                  </Td>
                  <Td className="text-xs text-ink-600">{event.summary ?? '—'}</Td>
                  <Td className="text-xs meta">
                    {event.beforeJson || event.afterJson ? (
                      <details>
                        <summary className="cursor-pointer">View</summary>
                        <pre className="mt-1 max-w-xs overflow-auto text-2xs whitespace-pre-wrap">{event.beforeJson ?? '—'}</pre>
                        <pre className="mt-1 max-w-xs overflow-auto text-2xs whitespace-pre-wrap">{event.afterJson ?? '—'}</pre>
                      </details>
                    ) : (
                      '—'
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          {pageCount > 1 ? (
            <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3">
              {page > 1 ? (
                <LinkButton
                  href={`/admin/audit?${new URLSearchParams({ ...(params.action ? { action: params.action } : {}), ...(params.entityType ? { entityType: params.entityType } : {}), ...(params.actor ? { actor: params.actor } : {}), page: String(page - 1) })}`}
                  variant="secondary"
                  size="sm"
                >
                  Newer
                </LinkButton>
              ) : null}
              <span className="text-sm text-ink-600">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <LinkButton
                  href={`/admin/audit?${new URLSearchParams({ ...(params.action ? { action: params.action } : {}), ...(params.entityType ? { entityType: params.entityType } : {}), ...(params.actor ? { actor: params.actor } : {}), page: String(page + 1) })}`}
                  variant="secondary"
                  size="sm"
                >
                  Older
                </LinkButton>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<EMPTY_STATE_ICONS.noResults className="size-5" aria-hidden="true" />}
          title="No audit entries match this filter"
          description={
            <>
              The log starts empty on a fresh deployment: seeding does not fabricate history. Sign-ins and every subsequent
              change appear here.
            </>
          }
        />
      )}

      <Card>
        <CardBody className="flex items-start gap-3 text-xs leading-relaxed meta">
          <ScrollText className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
          <p>
            Retention: audit rows are kept for the life of the deployment so a participant can ask “what happened to my
            application?” and get a factual answer. Personal data is minimised — the log stores identifiers and labels, not
            application contents.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
