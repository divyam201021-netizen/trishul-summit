import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { listApplicationsForAdmin } from '@/lib/applications/queries'
import { recordAudit } from '@/lib/audit'
import { statusMeta } from '@/lib/registration/status'
import { formatIsoDate, toCsv } from '@/lib/utils'

/**
 * CSV export of the current application view.
 *
 * Deliberate constraints:
 *  • requires `applications.export`, checked server-side;
 *  • exports only the columns the role is allowed to see — an account without
 *    `applications.sensitive` receives references and statuses, never names,
 *    emails or institutions;
 *  • writes an audit entry naming the account and the row count;
 *  • hard-caps the row count so a single request cannot dump the whole database;
 *  • responds with no-store so a shared machine cannot serve a cached copy.
 */
const MAX_PAGES = 20
const PAGE_SIZE = 100

export async function GET(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Sign in to the organizer workspace to export.' }, { status: 401 })
  }
  if (!hasPermission(admin.permissions, PERMISSIONS.applicationsExport)) {
    return NextResponse.json(
      { error: 'Your role does not include applications.export. Ask a director for access.' },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const canSeeSensitive = hasPermission(admin.permissions, PERMISSIONS.applicationsSensitive)

  const filters = {
    q: url.searchParams.get('q') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    committee: url.searchParams.get('committee') ?? undefined,
    payment: url.searchParams.get('payment') ?? undefined,
    sort: (url.searchParams.get('sort') as 'submitted' | 'reference' | 'status' | undefined) ?? 'submitted',
  }

  const header = [
    'Reference',
    'Submitted at',
    'Status',
    'Status meaning',
    ...(canSeeSensitive ? ['Full name', 'Email', 'Institution', 'Country', 'Time zone'] : []),
    'Committee',
    'Preferences',
    'Payment status',
  ]

  const rows: (string | number | null)[][] = [header]
  let page = 1
  let total = 0

  for (; page <= MAX_PAGES; page += 1) {
    const batch = await listApplicationsForAdmin({ ...filters, page, pageSize: PAGE_SIZE })
    total = batch.total
    for (const row of batch.rows) {
      const meta = statusMeta(row.status)
      rows.push([
        row.reference,
        formatIsoDate(row.submittedAt) ?? '',
        meta.label,
        meta.explanation,
        ...(canSeeSensitive
          ? [
              row.participant.fullName,
              row.participant.email,
              row.participant.institution ?? '',
              row.participant.country ?? '',
              row.participant.timeZone ?? '',
            ]
          : []),
        row.assignedCommittee?.name ?? (row.assignedCommittee ? 'Placeholder committee' : ''),
        row.preferences
          .map((preference) => `#${preference.rank} ${preference.committee.name ?? 'Name to be confirmed'}`)
          .join(' | '),
        row.payments[0]?.status ?? 'no record',
      ])
    }
    if (page >= batch.pageCount) break
  }

  await recordAudit({
    actorType: 'admin',
    actorId: admin.id,
    actorLabel: admin.name,
    action: 'applications.exported',
    entityType: 'Application',
    entityId: null,
    summary: `Exported ${rows.length - 1} application row(s)${canSeeSensitive ? ' including personal data' : ' without personal data'}`,
    after: { filters, exported: rows.length - 1, total, sensitive: canSeeSensitive },
  })

  const truncated = total > MAX_PAGES * PAGE_SIZE
  const csv = `${toCsv(rows)}${truncated ? '\r\n# Export truncated at 2000 rows — narrow the filters to export the rest.\r\n' : ''}`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="trishul-applications-${formatIsoDate(new Date())}.csv"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}
