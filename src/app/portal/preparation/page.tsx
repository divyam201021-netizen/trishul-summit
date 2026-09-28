import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CircleCheck, Laptop, Link2, ShieldCheck, Video } from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { getParticipantApplication, getParticipantProfile } from '@/lib/applications/queries'
import { getEventConfig } from '@/lib/config'
import {
  Alert,
  Badge,
  Breadcrumbs,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  KeyValue,
  SectionHeading,
} from '@/components/ui/primitives'
import { PendingContent, Tbd } from '@/components/ui/placeholder'
import { LinkButton } from '@/components/ui/button'

/**
 * Preparation hub.
 *
 * The platform name, technical requirements and joining instructions come from
 * the configuration registry, so an organizer can publish them without a
 * deployment. The joining link itself is only revealed to CONFIRMED
 * participants — it is never rendered on a public route or in an email to an
 * unconfirmed applicant.
 */
export default async function PortalPreparationPage() {
  const participant = await requireParticipant('/portal/preparation')
  const [application, profile, config] = await Promise.all([
    getParticipantApplication(participant.id),
    getParticipantProfile(participant.id),
    getEventConfig(),
  ])

  if (!application) notFound()

  const confirmed = application.status === 'CONFIRMED'
  const joinUrl = config.text('platform.joinUrl')
  const supportEmail = config.text('contact.supportEmail')

  const checklist: { title: string; detail: string | null }[] = [
    {
      title: 'Check your device and connection',
      detail: config.text('platform.technicalRequirements'),
    },
    {
      title: 'Confirm your time zone in this portal',
      detail: profile?.timeZone
        ? `We have you in ${profile.timeZone}. Change it on your application page if that is wrong.`
        : 'We do not have a time zone for you yet. Add one on your application page so reminders arrive at sensible hours.',
    },
    {
      title: 'Read the Code of Conduct',
      detail: 'Diplomatic, respectful conduct applies in every summit space, including chat and breakout rooms.',
    },
    {
      title: 'Prepare your opening position',
      detail: config.text('platform.joiningInstructions'),
    },
  ]

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Portal', href: '/portal' }, { label: 'Preparation' }]} />

      <SectionHeading
        as="h1"
        eyebrow="Preparation"
        title="Getting ready"
        description="Everything here is published by the organizing committee. Where something is still to be confirmed, we say so instead of guessing."
      />

      {!confirmed ? (
        <Alert tone="info" title="Preparation information is open to you already">
          You do not have to wait for your place to be confirmed to prepare. Joining links and room access are released
          only once a place is confirmed, because they are access-controlled.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card id="technical" className="scroll-mt-24">
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Laptop className="size-4 meta" aria-hidden="true" />
                Technical requirements
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-1">
                <p className="eyebrow meta">Platform</p>
                <p className="text-sm text-ink-800">{config.text('platform.name') ?? <Tbd label="ONLINE PLATFORM" />}</p>
              </div>
              {config.text('platform.technicalRequirements') ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">
                  {config.text('platform.technicalRequirements')}
                </p>
              ) : (
                <PendingContent title="[TECHNICAL REQUIREMENTS — TBD]">
                  The organizing committee has not published the technical requirements yet. We publish them as a checked
                  list rather than a guess, so you can rely on them.
                </PendingContent>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Link2 className="size-4 meta" aria-hidden="true" />
                Joining instructions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {config.text('platform.joiningInstructions') ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">
                  {config.text('platform.joiningInstructions')}
                </p>
              ) : (
                <PendingContent title="[JOINING INSTRUCTIONS — TBD]">
                  Instructions are not published yet. When they are, this page will show exactly how to join, what to
                  expect on arrival, and who to contact if the link fails.
                </PendingContent>
              )}

              <div className="rounded-lg border border-ink-200 bg-paper-sunk/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="eyebrow meta">Your joining link</span>
                  {confirmed && joinUrl ? (
                    <Badge tone="positive" icon={<CircleCheck className="size-3" aria-hidden="true" />}>
                      Released
                    </Badge>
                  ) : (
                    <Badge tone="outline">Not yet released</Badge>
                  )}
                </div>
                <div className="mt-2.5">
                  {confirmed && joinUrl ? (
                    <>
                      <LinkButton href={joinUrl} variant="brand" size="sm" rel="noreferrer noopener" target="_blank">
                        Open the platform
                      </LinkButton>
                      <p className="mt-2 text-xs leading-relaxed meta">
                        This link is private to confirmed participants. Do not forward it or post it publicly — capacity
                        and moderation depend on knowing who is in the room.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-ink-600">
                      {confirmed ? (
                        <>
                          Your place is confirmed, but the organizing committee has not published the platform link yet.
                          It will appear here: <Tbd label="JOINING LINK" />.
                        </>
                      ) : (
                        <>
                          The joining link is released when your place is confirmed, so it cannot leak to people without a
                          place. <Tbd label="JOINING LINK" />
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Video className="size-4 meta" aria-hidden="true" />
                Recording & privacy
              </CardTitle>
            </CardHeader>
            <CardBody>
              {config.text('platform.recordingPolicy') ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">
                  {config.text('platform.recordingPolicy')}
                </p>
              ) : (
                <PendingContent title="[RECORDING POLICY — TBD]">
                  The organizing committee has not published its recording policy. Until it does, assume nothing is
                  recorded for publication, and ask before recording anything yourself.
                </PendingContent>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Before you arrive</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="space-y-4">
                {checklist.map((item, index) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-paper-sunk font-mono text-2xs meta">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-ink-900">{item.title}</p>
                      <p className="text-xs leading-relaxed text-ink-600">
                        {item.detail ?? <Tbd label="GUIDANCE" />}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Conduct</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                Every participant agrees to the Code of Conduct when registering. It applies in the platform, in
                text channels and outside formal sessions.
              </p>
              <LinkButton href="/policies/code-of-conduct" variant="secondary" size="sm">
                Read the Code of Conduct
              </LinkButton>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Your details</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Participant">{profile?.fullName ?? participant.fullName}</KeyValue>
                <KeyValue label="Time zone">{profile?.timeZone ?? <Tbd label="TIME ZONE" />}</KeyValue>
                <KeyValue label="Preferred language">
                  {profile?.preferredLanguage ?? <span className="meta">Not provided</span>}
                </KeyValue>
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                <LinkButton href="/portal/application" variant="secondary" size="sm">
                  Update details
                </LinkButton>
                <Link href="/portal/support" className="link-underline self-center text-sm text-brand-700">
                  {supportEmail ? 'Support' : 'Support (contact pending)'}
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
