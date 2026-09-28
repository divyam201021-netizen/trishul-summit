import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Info, Languages, Signal, UserCheck, Users } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getCommitteeBySlug } from '@/lib/content/queries'
import { getEventConfig } from '@/lib/config'
import { getCurrentParticipant } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import {
  Alert,
  Breadcrumbs,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  KeyValue,
  Section,
  badgeVariants,
} from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Ph, Tbd, PendingContent } from '@/components/ui/placeholder'
import { TrackedLink, PageViewEvent } from '@/components/site/analytics-events'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const committee = await getCommitteeBySlug(slug)
  const name = committee?.name ?? 'Committee'
  return buildPageMetadata({
    title: name,
    description:
      committee?.topic ?? committee?.description ?? 'Committee detail, agenda and preparation information.',
    path: `/committees/${slug}`,
  })
}

export default async function CommitteeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [committee, config, participant] = await Promise.all([
    getCommitteeBySlug(slug),
    getEventConfig(),
    getCurrentParticipant(),
  ])

  if (!committee) notFound()

  const statusCopy: Record<string, { label: string; tone: 'positive' | 'warning' | 'neutral' }> = {
    open: { label: 'Open for preferences', tone: 'positive' },
    waitlist: { label: 'Waitlist only', tone: 'warning' },
    closed: { label: 'Closed', tone: 'neutral' },
  }
  // Only claim an availability the organizer has actually set.
  const status = statusCopy[committee.status]
  const statusBadge = status ? (
    <span className={badgeVariants({ tone: status.tone })}>{status.label}</span>
  ) : (
    <Tbd label="OPEN / CLOSED" />
  )
  const assigned = committee._count.assignedApplications
  const remaining = committee.capacity == null ? null : Math.max(0, committee.capacity - assigned)
  // Preferences are recorded through the registration flow, which works whether
  // or not the visitor is already signed in (it resumes their draft).
  const preferenceHref = '/register'

  return (
    <>
      <PageViewEvent event="committee_viewed" props={{ slug: committee.slug }} />

      <Section className="pb-8 sm:pb-10">
        <div className="shell">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Committees', href: '/committees' },
              { label: committee.name ?? 'Committee' },
            ]}
          />

          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow text-brand-700">
                  {committee.type ? committee.type : <Tbd label="COMMITTEE TYPE" />}
                </span>
                {statusBadge}
                {committee.isPlaceholder ? <span className={badgeVariants({ tone: 'warning' })}>Placeholder entry</span> : null}
              </div>

              <h1 className="font-display text-display">
                {committee.name ? committee.name : <Tbd label="COMMITTEE NAME" />}
              </h1>

              <div className="space-y-2">
                <p className="font-mono text-2xs tracking-wider meta uppercase">Agenda / topic</p>
                <p className="text-lg leading-relaxed text-ink-800">
                  {committee.topic ? committee.topic : <Tbd label="AGENDA / TOPIC" />}
                </p>
              </div>

              <div className="prose-editorial max-w-2xl">
                {committee.description ? (
                  <p>{committee.description}</p>
                ) : (
                  <PendingContent title="Committee description not published">
                    This committee exists in the directory, but the organizing committee has not published its
                    description yet.
                  </PendingContent>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <TrackedLink event="registration_cta_clicked" props={{ location: 'committee-detail', label: 'preference' }}>
                  <LinkButton href={preferenceHref} variant="primary" size="lg">
                    Add to preferences
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </LinkButton>
                </TrackedLink>
                <LinkButton href="/delegate-info" variant="secondary" size="lg">
                  Delegate information
                </LinkButton>
              </div>

              {!config.bool('event.preferencesGuaranteed') ? (
                <Alert tone="info" title="Preferences are not guaranteed assignments">
                  Selecting this committee records a preference. The organizing committee allocates places against
                  capacity, experience and language, and confirms allocations individually.
                </Alert>
              ) : null}
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Committee facts</CardTitle>
                <p className="text-xs meta">Published by the organizing committee</p>
              </CardHeader>
              <CardBody className="pt-2">
                <dl className="divide-y divide-ink-100">
                  <KeyValue label="Availability">
                    {statusBadge}
                  </KeyValue>
                  <KeyValue label="Experience level">
                    {committee.experienceLevel ? (
                      <span className="inline-flex items-center gap-2">
                        <Signal className="size-3.5 text-ink-400" aria-hidden="true" />
                        {committee.experienceLevel}
                      </span>
                    ) : (
                      <Tbd label="EXPERIENCE LEVEL" />
                    )}
                  </KeyValue>
                  <KeyValue label="Language">
                    {committee.language ? (
                      <span className="inline-flex items-center gap-2">
                        <Languages className="size-3.5 text-ink-400" aria-hidden="true" />
                        {committee.language}
                      </span>
                    ) : (
                      <Tbd label="LANGUAGE" />
                    )}
                  </KeyValue>
                  <KeyValue label="Capacity">
                    {committee.capacity != null ? (
                      <span className="inline-flex items-center gap-2 tabular-nums">
                        <Users className="size-3.5 text-ink-400" aria-hidden="true" />
                        {committee.capacity} places
                      </span>
                    ) : (
                      <Tbd label="CAPACITY" />
                    )}
                  </KeyValue>
                  <KeyValue label="Allocated / remaining">
                    {committee.capacity != null ? (
                      <span className="tabular-nums">
                        {assigned} allocated · {remaining} remaining
                      </span>
                    ) : (
                      <Tbd label="ASSIGNED / REMAINING" />
                    )}
                  </KeyValue>
                  <KeyValue label="Confirmations requested">
                    <span className="tabular-nums">{committee._count.preferences}</span>
                  </KeyValue>
                </dl>
              </CardBody>
            </Card>
          </div>
        </div>
      </Section>

      <Section surface="sunk" className="border-y border-ink-200 py-14">
        <div className="shell">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expected participant profile</CardTitle>
              </CardHeader>
              <CardBody className="text-sm leading-relaxed text-ink-600">
                {committee.expectedProfile ? <p>{committee.expectedProfile}</p> : <Ph path="event.eligibility" />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preparation information</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
                {committee.preparationInfo ? (
                  <p className="whitespace-pre-line">{committee.preparationInfo}</p>
                ) : (
                  <>
                    <p className="flex flex-wrap items-center gap-2">
                      <Tbd label="PREPARATION INFORMATION" />
                    </p>
                    <p className="text-xs meta">
                      Study guides and preparation notes are published here once released by the committee team.
                    </p>
                  </>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="size-4 meta" aria-hidden="true" />
                  Committee team
                </CardTitle>
              </CardHeader>
              <CardBody>
                {committee.chairName ? (
                  <div className="flex flex-wrap items-baseline gap-3">
                    <p className="font-display text-lg text-ink-900">{committee.chairName}</p>
                    {committee.chairTitle ? <p className="text-sm text-ink-600">{committee.chairTitle}</p> : null}
                  </div>
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
                    <Tbd label="CHAIR NAME" />
                    <span className="text-xs meta">
                      Chair and committee team details are published only when officially supplied by the organizing
                      committee.
                    </span>
                  </p>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed meta">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Nothing on this page is inferred. Fields awaiting confirmation are shown as placeholders so you can tell
            exactly which information has been published and which has not.
          </p>
        </div>
      </Section>

      <Section className="py-14">
        <div className="shell flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-ink-900">Considering another committee?</h2>
            <p className="text-sm text-ink-600">You can rank multiple preferences during registration.</p>
          </div>
          <LinkButton href="/committees" variant="secondary">
            Back to the directory
          </LinkButton>
        </div>
      </Section>
    </>
  )
}
