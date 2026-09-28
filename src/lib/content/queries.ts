import { prisma } from '@/lib/db/client'
import type { Committee, FAQItem, Policy, ScheduleSession } from '@prisma/client'

export interface CommitteeFilters {
  q?: string
  status?: string
  experience?: string
  language?: string
  sort?: 'order' | 'name' | 'capacity'
}

export interface CommitteeWithLoad extends Committee {
  assignedCount: number
  activePreferenceCount: number
}

/** Public committee directory: searchable, filterable, sortable. */
export async function listCommittees(filters: CommitteeFilters = {}): Promise<CommitteeWithLoad[]> {
  const committees = await prisma.committee.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: { select: { assignedApplications: true, preferences: true } },
    },
  })

  const query = filters.q?.trim().toLowerCase()
  let result: CommitteeWithLoad[] = committees.map((committee) => ({
    ...committee,
    assignedCount: committee._count.assignedApplications,
    activePreferenceCount: committee._count.preferences,
  }))

  if (query) {
    result = result.filter((committee) =>
      [committee.name, committee.type, committee.topic, committee.description, committee.language]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(query)),
    )
  }
  if (filters.status && filters.status !== 'all') {
    result = result.filter((committee) => committee.status === filters.status)
  }
  if (filters.experience && filters.experience !== 'all') {
    result = result.filter((committee) => committee.experienceLevel === filters.experience)
  }
  if (filters.language && filters.language !== 'all') {
    result = result.filter((committee) => committee.language === filters.language)
  }

  if (filters.sort === 'name') {
    result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  } else if (filters.sort === 'capacity') {
    result.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0))
  }

  return result
}

export async function getCommitteeBySlug(slug: string) {
  return prisma.committee.findUnique({
    where: { slug },
    include: { _count: { select: { assignedApplications: true, preferences: true } } },
  })
}

export async function committeeFilterOptions() {
  const committees = await prisma.committee.findMany({
    select: { language: true, experienceLevel: true, status: true },
  })
  const unique = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort()
  return {
    languages: unique(committees.map((committee) => committee.language)),
    experiences: unique(committees.map((committee) => committee.experienceLevel)),
    statuses: unique(committees.map((committee) => committee.status)),
  }
}

export interface AllocationRow {
  committee: Committee
  capacity: number | null
  assigned: number
  remaining: number | null
  waitlist: number
  preferences: number
}

export async function allocationOverview(): Promise<AllocationRow[]> {
  const committees = await prisma.committee.findMany({
    orderBy: [{ displayOrder: 'asc' }],
    include: {
      _count: { select: { assignedApplications: true, preferences: true } },
    },
  })

  const waitlisted = await prisma.application.groupBy({
    by: ['assignedCommitteeId'],
    where: { status: 'WAITLISTED' },
    _count: { _all: true },
  })
  const waitlistByCommittee = new Map(
    waitlisted
      .filter((row) => row.assignedCommitteeId)
      .map((row) => [row.assignedCommitteeId as string, row._count._all]),
  )

  return committees.map((committee) => ({
    committee,
    capacity: committee.capacity,
    assigned: committee._count.assignedApplications,
    remaining: committee.capacity == null ? null : Math.max(0, committee.capacity - committee._count.assignedApplications),
    waitlist: waitlistByCommittee.get(committee.id) ?? 0,
    preferences: committee._count.preferences,
  }))
}

export interface ScheduleDay {
  key: string
  label: string
  date: Date | null
  timeZone: string | null
  sessions: ScheduleSession[]
}

/**
 * Sessions are grouped by day. A session time is NEVER rendered without an
 * explicit time zone — callers must check `timeZone` before formatting.
 */
export async function listSchedule(): Promise<ScheduleDay[]> {
  const sessions = await prisma.scheduleSession.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
    include: { committee: { select: { slug: true, name: true } } },
  })

  const days = new Map<string, ScheduleDay>()
  for (const session of sessions) {
    const key = session.dayLabel ?? (session.date ? session.date.toISOString().slice(0, 10) : 'unscheduled')
    if (!days.has(key)) {
      days.set(key, {
        key,
        label: session.dayLabel ?? (session.date ? session.date.toISOString().slice(0, 10) : '[DAY LABEL — TBD]'),
        date: session.date,
        timeZone: session.timeZone,
        sessions: [],
      })
    }
    const day = days.get(key)!
    if (!day.timeZone && session.timeZone) day.timeZone = session.timeZone
    day.sessions.push(session)
  }
  return [...days.values()]
}

export async function listFaq(category?: string): Promise<FAQItem[]> {
  return prisma.fAQItem.findMany({
    where: { published: true, ...(category ? { category } : {}) },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function listPolicies(): Promise<Policy[]> {
  return prisma.policy.findMany({ where: { published: true }, orderBy: { title: 'asc' } })
}

export async function getPolicyBySlug(slug: string): Promise<Policy | null> {
  return prisma.policy.findUnique({ where: { slug } })
}

export async function listAnnouncements(audience: 'public' | 'participants') {
  return prisma.announcement.findMany({
    where: { audience, publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  })
}

export async function committeeCount() {
  return prisma.committee.count()
}

export async function publishedScheduleCount() {
  return prisma.scheduleSession.count({ where: { published: true } })
}
