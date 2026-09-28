import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Hourglass, Languages, Layers, Signal, UserRound, Users } from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { getParticipantApplication, getParticipantProfile } from '@/lib/applications/queries'
import { getEventConfig } from '@/lib/config'
import { formatDate } from '@/lib/utils'
import {
  Alert,
  Badge,
  Breadcrumbs,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EMPTY_STATE_ICONS,
  KeyValue,
  SectionHeading,
} from '@/components/ui/primitives'
import { PendingContent, Tbd } from '@/components/ui/placeholder'
import { LinkButton } from '@/components/ui/button'

/**
 * Committee information is released only when the organizer marks the
 * application CONFIRMED. Before that, the participant sees their own
 * preferences and an honest explanation of the process — never a provisional
 * allocation presented as final.
 */
export default async function PortalCommitteePage() {
  const participant = await requireParticipant('/portal/committee')
  const [application, profile, config] = await Promise.all([
    getParticipantApplication(participant.id),
    getParticipantProfile(participant.id),
    getEventConfig(),
  ])

  if (!application) notFound()

  const committee = application.assignedCommittee
  const allocationProcess = config.text('event.allocationProcess')

  if (!application.committeeReleased || !committee) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: 'Portal', href: '/portal' }, { label: 'My committee' }]} />

        <SectionHeading
          as="h1"
          eyebrow="Committee"
          title="Your allocation has not been released yet"
          description="Allocations are released together, once the organizing committee has finished reviewing applications and confirming places. Nothing is withheld from you deliberately — a provisional allocation would simply be unreliable."
        />

        <EmptyState
          icon={<EMPTY_STATE_ICONS.noAssignment className="size-5" aria-hidden="true" />}
          title="Allocation pending"
          description={
            <>
              You will be notified by email, and this page will show your committee, agenda, chair and preparation
              material the moment it is released.
            </>
          }
          action={<LinkButton href="/portal/application" variant="secondary">Review your preferences</LinkButton>}
        />

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Hourglass className="size-4 meta" aria-hidden="true" />
              How allocation works
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {allocationProcess ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">{allocationProcess}</p>
            ) : (
              <PendingContent title="[ALLOCATION PROCESS — TBD]">
                The organizing committee has not yet published how allocation decisions are made. We would rather show
                that this is pending than describe a process that may change.
              </PendingContent>
            )}
            <div className="space-y-2">
              <p className="eyebrow meta">Your preferences, in order</p>
              {application.preferences.length ? (
                <ol className="space-y-2 text-sm text-ink-700">
                  {application.preferences.map((preference) => (
                    <li key={preference.rank} className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-2xs meta">#{preference.rank}</span>
                      {preference.committeeName ?? 'Name to be confirmed'}
                      {preference.status === 'waitlist' ? <Badge tone="warning">Waitlist only</Badge> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-600">No preferences were recorded on your application.</p>
              )}
            </div>
            <p className="text-xs leading-relaxed meta">
              Preferences are recorded in the order you chose them and are used as a strong signal, but they are not
              guarantees.{' '}
              {config.bool('event.preferencesGuaranteed')
                ? 'The organizing committee has confirmed that preferences are honoured where possible.'
                : ''}
            </p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Portal', href: '/portal' }, { label: 'My committee' }]} />

      <header className="space-y-4">
        <Badge tone="positive">Allocation released</Badge>
        <SectionHeading
          as="h1"
          eyebrow={committee.type ?? 'Committee'}
          title={committee.name ?? <Tbd label="COMMITTEE NAME" />}
          description="Everything you need to prepare for your committee — agenda, working language, chair and preparation guidance."
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Agenda and brief</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-1">
                <p className="eyebrow meta">Agenda / topic</p>
                <p className="text-sm leading-relaxed text-ink-800">
                  {committee.topic ?? <Tbd label="AGENDA / TOPIC" />}
                </p>
              </div>
              <div className="space-y-1">
                <p className="eyebrow meta">What you will do</p>
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">
                  {committee.expectedProfile ?? <Tbd label="COMMITTEE BRIEF" />}
                </p>
              </div>
              <div className="space-y-1">
                <p className="eyebrow meta">Preparation guidance</p>
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">
                  {committee.preparationInfo ?? <Tbd label="PREPARATION GUIDANCE" />}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Before your first session</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-700">
              <p>
                Work through the preparation section: platform checks, joining instructions and the conduct agreement
                all live there, and they are the same for every participant.
              </p>
              <div className="flex flex-wrap gap-3">
                <LinkButton href="/portal/preparation" variant="brand" size="sm">
                  Preparation & technical checks
                </LinkButton>
                <LinkButton href="/policies/code-of-conduct" variant="secondary" size="sm">
                  Code of Conduct
                </LinkButton>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Committee at a glance</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Language">
                  {committee.language ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Languages className="size-3.5 text-ink-400" aria-hidden="true" />
                      {committee.language}
                    </span>
                  ) : (
                    <Tbd label="COMMITTEE LANGUAGE" />
                  )}
                </KeyValue>
                <KeyValue label="Experience level">
                  <span className="inline-flex items-center gap-1.5">
                    <Signal className="size-3.5 text-ink-400" aria-hidden="true" />
                    {committee.experienceLevel ?? <Tbd label="EXPERIENCE LEVEL" />}
                  </span>
                </KeyValue>
                <KeyValue label="Chair">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="size-3.5 text-ink-400" aria-hidden="true" />
                    {committee.chairName ?? <Tbd label="CHAIR NAME" />}
                    {committee.chairTitle ? <span className="meta"> · {committee.chairTitle}</span> : null}
                  </span>
                </KeyValue>
                <KeyValue label="Capacity">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5 text-ink-400" aria-hidden="true" />
                    <Tbd label="CAPACITY" />
                  </span>
                </KeyValue>
                <KeyValue label="Type">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="size-3.5 text-ink-400" aria-hidden="true" />
                    {committee.type ?? <Tbd label="COMMITTEE TYPE" />}
                  </span>
                </KeyValue>
                {profile?.timeZone ? <KeyValue label="Your time zone">{profile.timeZone}</KeyValue> : null}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Published committee page</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-ink-600">
              <p>
                Your committee also has a public page describing the agenda and expectations, which you can share with
                your institution.
              </p>
              <Link
                href={`/committees/${committee.slug}`}
                className="link-underline text-brand-700"
              >
                View committee page
              </Link>
              {application.submittedAt ? (
                <p className="text-xs meta">
                  Allocation released after your application on {formatDate(application.submittedAt, profile?.timeZone ?? undefined)}.
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

      {!committee.chairName ? (
        <Alert tone="neutral" title="Chair details and brief are still being finalised">
          The agenda you see is the published agenda. Chair names and briefing material appear here as soon as the
          organizing committee confirms them.
        </Alert>
      ) : null}
    </div>
  )
}
