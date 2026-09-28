import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  Clock4,
  CreditCard,
  Globe,
  Info,
  Mail,
  Megaphone,
  Sparkles,
} from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { getEventConfig } from '@/lib/config'
import { getParticipantApplication, getParticipantProfile } from '@/lib/applications/queries'
import { listAnnouncements } from '@/lib/content/queries'
import { PAYMENT_STATUS_META } from '@/lib/payments'
import { statusMeta } from '@/lib/registration/status'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EMPTY_STATE_ICONS,
  KeyValue,
  SectionHeading,
  StatusBadge,
} from '@/components/ui/primitives'
import { PendingContent, Tbd } from '@/components/ui/placeholder'
import { LinkButton } from '@/components/ui/button'

/**
 * Portal dashboard.
 *
 * The first screen answers three questions without scrolling on a phone:
 *   1. What is the state of my application?
 *   2. What, if anything, do I need to do?
 *   3. What happens next, and when?
 */
export default async function PortalDashboardPage() {
  const participant = await requireParticipant('/portal')
  const [config, application, profile, announcements] = await Promise.all([
    getEventConfig(),
    getParticipantApplication(participant.id),
    getParticipantProfile(participant.id),
    listAnnouncements('participants'),
  ])

  const firstName = (profile?.fullName ?? participant.fullName).split(' ')[0] ?? 'there'

  if (!application) {
    return (
      <div className="space-y-8">
        <SectionHeading
          as="h1"
          eyebrow="My registration"
          title={`Welcome, ${firstName}`}
          description="Your account is active, but no application is attached to it yet."
        />
        <EmptyState
          icon={<EMPTY_STATE_ICONS.noResults className="size-5" aria-hidden="true" />}
          title="No application on file"
          description={
            <>
              If you started an application with a different email address, sign out and sign back in with that address.
              Otherwise, start a new application — it takes a few minutes and your progress is saved as you go.
            </>
          }
          action={
            <LinkButton href="/register" variant="brand">
              Start an application
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          }
        />
      </div>
    )
  }

  const meta = statusMeta(application.status)
  const paymentMeta = PAYMENT_STATUS_META[application.payment.status]
  const supportEmail = config.text('contact.supportEmail')
  const confirmed = application.status === 'CONFIRMED'

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={application.status} />
          <span className="font-mono text-2xs tracking-[0.14em] meta uppercase">
            Reference {application.reference}
          </span>
        </div>
        <SectionHeading
          as="h1"
          eyebrow={`Welcome, ${firstName}`}
          title={meta.label}
          description={meta.explanation}
        />
        <Alert tone={meta.tone === 'positive' ? 'success' : meta.tone === 'warning' ? 'warning' : 'info'} title="What to do now">
          {meta.nextAction}
        </Alert>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Allocation released ------------------------------------------- */}
          {confirmed && application.assignedCommittee ? (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-success-600" aria-hidden="true" />
                  Your committee allocation
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="font-display text-xl text-ink-900">
                  {application.assignedCommittee.name ?? <Tbd label="COMMITTEE NAME" />}
                </p>
                <dl>
                  <KeyValue label="Agenda / topic">
                    {application.assignedCommittee.topic ?? <Tbd label="AGENDA / TOPIC" />}
                  </KeyValue>
                  <KeyValue label="Language">
                    {application.assignedCommittee.language ?? <Tbd label="COMMITTEE LANGUAGE" />}
                  </KeyValue>
                  <KeyValue label="Chair">
                    {application.assignedCommittee.chairName ?? <Tbd label="CHAIR NAME" />}
                  </KeyValue>
                </dl>
                <div className="flex flex-wrap gap-3">
                  <LinkButton href="/portal/committee" variant="secondary" size="sm">
                    Committee information
                  </LinkButton>
                  <LinkButton href="/portal/preparation" variant="secondary" size="sm">
                    Preparation
                  </LinkButton>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* Payment -------------------------------------------------------- */}
          {application.status === 'ACCEPTED_PAYMENT_PENDING' || application.payment.status !== 'not_configured' ? (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2">
                  <CreditCard className="size-4 meta" aria-hidden="true" />
                  Participation fee
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={paymentMeta.tone === 'positive' ? 'positive' : paymentMeta.tone === 'warning' ? 'warning' : 'outline'}>
                    {paymentMeta.label}
                  </Badge>
                  {application.payment.amountMinor != null && application.payment.currency ? (
                    <span className="text-sm text-ink-700 tabular-nums">
                      {application.payment.currency} {(application.payment.amountMinor / 100).toFixed(2)}
                    </span>
                  ) : (
                    <Tbd label="PARTICIPATION FEE" />
                  )}
                </div>
                <p className="text-sm leading-relaxed text-ink-600">{paymentMeta.explanation}</p>
                {!application.paymentEnabled ? (
                  <PendingContent title="[PAYMENT DETAILS — TBD]">
                    No payment provider is configured yet, so no payment can be collected and no card details are ever
                    requested here. The organizing committee will publish the fee, the payment method and the refund
                    policy before any payment is taken.
                  </PendingContent>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {/* Timeline ------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Clock4 className="size-4 meta" aria-hidden="true" />
                Application timeline
              </CardTitle>
            </CardHeader>
            <CardBody>
              {application.timeline.length ? (
                <ol className="space-y-0">
                  {application.timeline.map((entry, index) => (
                    <li key={`${entry.status}-${entry.at.toISOString()}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                      <span className="relative flex flex-col items-center">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 size-2.5 rounded-full ${
                            index === application.timeline.length - 1 ? 'bg-brand-600' : 'bg-ink-300'
                          }`}
                        />
                        {index < application.timeline.length - 1 ? (
                          <span aria-hidden="true" className="mt-1 w-px flex-1 bg-ink-200" />
                        ) : null}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-ink-900">{entry.label}</p>
                        <p className="text-xs meta">{formatDateTime(entry.at, profile?.timeZone ?? undefined)}</p>
                        {entry.publicNote ? (
                          <p className="text-sm leading-relaxed text-ink-600">{entry.publicNote}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-600">
                  Your application has not been submitted yet — the timeline begins the moment you submit it.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Submitted answers --------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle as="h2">What you submitted</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Full name">{profile?.fullName ?? participant.fullName}</KeyValue>
                <KeyValue label="Email">{profile?.email ?? participant.email}</KeyValue>
                <KeyValue label="Institution">
                  {profile?.institution ?? <Tbd label="INSTITUTION" />}
                </KeyValue>
                <KeyValue label="Country / region">
                  {(profile?.country ?? profile?.region) ?? <Tbd label="COUNTRY / REGION" />}
                </KeyValue>
                <KeyValue label="Time zone">{profile?.timeZone ?? <Tbd label="TIME ZONE" />}</KeyValue>
                <KeyValue label="Applying as">
                  {application.rolePreference
                    ? application.rolePreference.replace(/_/g, ' ')
                    : <Tbd label="ROLE" />}
                </KeyValue>
                <KeyValue label="Prior MUN experience">
                  {application.munExperience ? application.munExperience.replace(/_/g, ' ') : <Tbd label="MUN EXPERIENCE" />}
                </KeyValue>
                <KeyValue label="Committee preferences">{renderPreferences(application)}</KeyValue>
                <KeyValue label="Policies accepted">
                  {application.policyVersion ? `Version ${application.policyVersion}` : <Tbd label="POLICY VERSION" />}
                </KeyValue>
                <KeyValue label="Submitted">
                  {application.submittedAt ? formatDateTime(application.submittedAt, profile?.timeZone ?? undefined) : 'Not submitted yet'}
                </KeyValue>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <LinkButton href="/portal/application" variant="secondary" size="sm">
                  View full application
                </LinkButton>
                {meta.editable ? (
                  <LinkButton href="/register" variant="primary" size="sm">
                    Continue editing
                  </LinkButton>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right rail ------------------------------------------------------- */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <CalendarDays className="size-4 meta" aria-hidden="true" />
                The summit
              </CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Date">{config.text('event.dateSummary') ?? <Tbd label="EVENT DATE" />}</KeyValue>
                <KeyValue label="Time zone">{config.text('event.timeZone') ?? <Tbd label="TIME ZONE" />}</KeyValue>
                <KeyValue label="Format">{config.text('event.format') ?? <Tbd label="EVENT FORMAT" />}</KeyValue>
                <KeyValue label="Platform">{config.text('platform.name') ?? <Tbd label="ONLINE PLATFORM" />}</KeyValue>
                <KeyValue label="Registration">
                  {config.text('identity.registrationStatusLabel') ?? <Tbd label="REGISTRATION STATUS" />}
                </KeyValue>
                {config.text('event.startDate') ? (
                  <KeyValue label="Starts">{formatDate(config.text('event.startDate'), config.text('event.timeZone'))}</KeyValue>
                ) : null}
              </dl>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed meta">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Values marked <span className="font-mono">TBD</span> have not been published by the organizing committee
                yet. Nothing here is estimated on your behalf.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Megaphone className="size-4 meta" aria-hidden="true" />
                Notices for participants
              </CardTitle>
            </CardHeader>
            <CardBody>
              {announcements.length ? (
                <ul className="space-y-4">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="space-y-1.5 border-b border-ink-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink-900">{announcement.title}</p>
                        {announcement.severity !== 'info' ? (
                          <Badge tone={announcement.severity === 'critical' ? 'negative' : 'warning'}>
                            {announcement.severity}
                          </Badge>
                        ) : null}
                      </div>
                      {announcement.body ? (
                        <p className="text-sm leading-relaxed whitespace-pre-line text-ink-600">{announcement.body}</p>
                      ) : null}
                      {announcement.publishedAt ? (
                        <p className="text-xs meta">{formatDateTime(announcement.publishedAt, profile?.timeZone ?? undefined)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-ink-600">
                  No participant notices have been published yet. Time-sensitive updates arrive by email as well — keep an
                  eye on{' '}
                  {supportEmail ? (
                    <a href={`mailto:${supportEmail}`} className="link-underline text-brand-700">
                      your inbox
                    </a>
                  ) : (
                    'your inbox'
                  )}
                  .
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Sparkles className="size-4 meta" aria-hidden="true" />
                Quick links
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/portal/committee" className="link-underline text-brand-700">
                    <Globe className="mr-1.5 inline size-3.5" aria-hidden="true" />
                    Committee information
                  </Link>
                </li>
                <li>
                  <Link href="/portal/schedule" className="link-underline text-brand-700">
                    <CalendarDays className="mr-1.5 inline size-3.5" aria-hidden="true" />
                    Schedule
                  </Link>
                </li>
                <li>
                  <Link href="/portal/preparation" className="link-underline text-brand-700">
                    <Info className="mr-1.5 inline size-3.5" aria-hidden="true" />
                    Preparation & technical checks
                  </Link>
                </li>
                <li>
                  <Link href="/policies/code-of-conduct" className="link-underline text-brand-700">
                    <CircleAlert className="mr-1.5 inline size-3.5" aria-hidden="true" />
                    Code of Conduct
                  </Link>
                </li>
                <li>
                  <Link href="/portal/support" className="link-underline text-brand-700">
                    <Mail className="mr-1.5 inline size-3.5" aria-hidden="true" />
                    Support
                  </Link>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function renderPreferences(application: Awaited<ReturnType<typeof getParticipantApplication>>) {
  if (!application?.preferences.length) {
    return <Tbd label="COMMITTEE PREFERENCES" />
  }
  return (
    <ol className="space-y-1">
      {application.preferences.map((preference) => (
        <li key={preference.rank}>
          <span className="font-mono text-2xs meta">{preference.rank}.</span>{' '}
          {preference.committeeName ?? 'Name to be confirmed'}
          {preference.status === 'waitlist' ? <span className="meta"> — waitlist only</span> : null}
        </li>
      ))}
    </ol>
  )
}
