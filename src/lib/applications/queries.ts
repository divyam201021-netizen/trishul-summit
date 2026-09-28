import { prisma, parseJson } from '@/lib/db/client'
import { currentPaymentSummary, providerStatus } from '@/lib/payments'
import { statusMeta, type ApplicationStatus } from '@/lib/registration/status'

/**
 * Participant-facing projections.
 *
 * These functions are the only way participant UI reads application data, and
 * they deliberately select a whitelist of fields: internal reviewer notes,
 * audit metadata, staff identities and unpublished programme data are never
 * part of the returned shape.
 */

export interface ParticipantPreferenceView {
  rank: number
  committeeId: string
  committeeName: string | null
  committeeSlug: string
  committeeType: string | null
  /** Availability of the preferred committee, for honest expectation-setting. */
  status: string
  note: string | null
}

export interface ParticipantApplicationView {
  id: string
  reference: string
  status: ApplicationStatus
  submittedAt: Date | null
  updatedAt: Date
  rolePreference: string | null
  munExperience: string | null
  experienceDetail: string | null
  motivation: string | null
  topicInterest: string | null
  preferences: ParticipantPreferenceView[]
  assignedCommittee: {
    slug: string
    name: string | null
    type: string | null
    topic: string | null
    language: string | null
    experienceLevel: string | null
    expectedProfile: string | null
    preparationInfo: string | null
    chairName: string | null
    chairTitle: string | null
  } | null
  /** True only after the organizer releases the allocation (status CONFIRMED). */
  committeeReleased: boolean
  payment: ReturnType<typeof currentPaymentSummary>
  paymentEnabled: boolean
  policyVersion: string | null
  /** Participant-visible status timeline (explanations only, no internal notes). */
  timeline: { status: ApplicationStatus; label: string; at: Date; publicNote: string | null }[]
}

export async function getParticipantApplication(participantId: string): Promise<ParticipantApplicationView | null> {
  const application = await prisma.application.findFirst({
    where: { participantId },
    orderBy: { createdAt: 'desc' },
    include: {
      preferences: { include: { committee: true }, orderBy: { rank: 'asc' } },
      assignedCommittee: true,
      payments: { select: { status: true, amountMinor: true, currency: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!application) return null

  const status = application.status.toUpperCase() as ApplicationStatus
  const committeeReleased = status === 'CONFIRMED'
  const assigned = committeeReleased ? application.assignedCommittee : null

  return {
    id: application.id,
    reference: application.reference,
    status,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    rolePreference: application.rolePreference,
    munExperience: application.munExperience,
    experienceDetail: application.experienceDetail,
    motivation: application.motivation,
    topicInterest: application.topicInterest,
    preferences: application.preferences.map((preference) => ({
      rank: preference.rank,
      committeeId: preference.committeeId,
      committeeName: preference.committee.name,
      committeeSlug: preference.committee.slug,
      committeeType: preference.committee.type,
      status: preference.committee.status,
      note: preference.note,
    })),
    assignedCommittee: assigned
      ? {
          slug: assigned.slug,
          name: assigned.name,
          type: assigned.type,
          topic: assigned.topic,
          language: assigned.language,
          experienceLevel: assigned.experienceLevel,
          expectedProfile: assigned.expectedProfile,
          preparationInfo: assigned.preparationInfo,
          chairName: assigned.chairName,
          chairTitle: assigned.chairTitle,
        }
      : null,
    committeeReleased,
    payment: currentPaymentSummary(application.payments),
    paymentEnabled: providerStatus().configured,
    policyVersion: application.policyVersion,
    timeline: application.statusHistory
      .filter((entry) => (entry.toStatus ?? '').toUpperCase() !== 'DRAFT')
      .map((entry) => ({
        status: entry.toStatus.toUpperCase() as ApplicationStatus,
        label: statusMeta(entry.toStatus).label,
        at: entry.createdAt,
        publicNote: entry.publicNote,
      })),
  }
}

export async function getParticipantProfile(participantId: string) {
  return prisma.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      email: true,
      fullName: true,
      country: true,
      region: true,
      timeZone: true,
      institution: true,
      participantCategory: true,
      ageBand: true,
      preferredLanguage: true,
      createdAt: true,
    },
  })
}

export async function getParticipantConsents(participantId: string) {
  return prisma.consent.findMany({
    where: { participantId },
    orderBy: { createdAt: 'desc' },
    select: { policySlug: true, kind: true, granted: true, grantedAt: true, revokedAt: true, version: true },
  })
}

// ---------------------------------------------------------------------------
// Organizer workspace
// ---------------------------------------------------------------------------

export interface AdminApplicationFilters {
  q?: string
  status?: string
  committee?: string
  payment?: string
  sort?: 'submitted' | 'reference' | 'status' | 'name'
  page?: number
  pageSize?: number
}

export async function listApplicationsForAdmin(filters: AdminApplicationFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25))

  const where: Record<string, unknown> = {}
  if (filters.status && filters.status !== 'all') where.status = filters.status.toUpperCase()
  if (filters.committee && filters.committee !== 'all') where.assignedCommitteeId = filters.committee
  // Payment state is a relation filter: an application "has" a payment in the
  // requested state, or no payment at all when 'none' is selected.
  if (filters.payment && filters.payment !== 'all') {
    where.payments = filters.payment === 'none' ? { none: {} } : { some: { status: filters.payment } }
  }
  const query = filters.q?.trim()
  if (query) {
    where.OR = [
      { reference: { contains: query.toUpperCase() } },
      { participant: { fullName: { contains: query } } },
      { participant: { email: { contains: query.toLowerCase() } } },
      { participant: { institution: { contains: query } } },
    ]
  }

  const orderBy =
    filters.sort === 'reference'
      ? [{ reference: 'asc' as const }]
      : filters.sort === 'status'
        ? [{ status: 'asc' as const }]
        : [{ submittedAt: 'desc' as const }, { createdAt: 'desc' as const }]

  const [rows, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        participant: { select: { fullName: true, email: true, institution: true, country: true, timeZone: true } },
        assignedCommittee: { select: { name: true, slug: true, isPlaceholder: true } },
        preferences: { include: { committee: { select: { name: true, slug: true } } }, orderBy: { rank: 'asc' } },
        payments: { select: { status: true, amountMinor: true, currency: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.application.count({ where }),
  ])

  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getApplicationForAdmin(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      participant: true,
      preferences: { include: { committee: true }, orderBy: { rank: 'asc' } },
      assignedCommittee: true,
      assignments: { orderBy: { createdAt: 'desc' }, include: { committee: true, assignedBy: { select: { name: true } } } },
      statusHistory: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } },
      notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } } } },
      payments: { orderBy: { createdAt: 'desc' }, include: { actions: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } } } },
      consents: { orderBy: { createdAt: 'desc' } },
      communications: { orderBy: { createdAt: 'desc' }, take: 25, include: { communication: { select: { subject: true, templateKey: true, sentAt: true } } } },
    },
  })
}

export async function dashboardCounts() {
  const [total, byStatus, capacity, paymentRows, placeholderCommittees] = await Promise.all([
    prisma.application.count({ where: { status: { not: 'DRAFT' } } }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.committee.aggregate({ _sum: { capacity: true } }).catch(() => ({ _sum: { capacity: null } })),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.committee.count({ where: { isPlaceholder: true } }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) statusCounts[row.status.toUpperCase()] = row._count._all
  const paymentCounts: Record<string, number> = {}
  for (const row of paymentRows) paymentCounts[row.status] = row._count._all

  const registeredParticipants = await prisma.participant.count()

  return {
    total,
    statusCounts,
    capacity: capacity._sum.capacity ?? null,
    paymentCounts,
    placeholderCommittees,
    registeredParticipants,
    usesPlaceholderCommittees: placeholderCommittees > 0,
  }
}

export async function recentApplicationActivity(limit = 8) {
  return prisma.applicationStatusHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      application: { select: { reference: true, id: true } },
      actor: { select: { name: true } },
    },
  })
}

export function applicationResponses(raw: string | null | undefined) {
  return parseJson<Record<string, string>>(raw, {})
}
