import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarClock, CircleCheck, Mail, ShieldCheck } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getEventConfig } from '@/lib/config'
import { getCurrentParticipant } from '@/lib/auth/session'
import { getParticipantApplication } from '@/lib/applications/queries'
import { Alert, Card, CardBody, Eyebrow, KeyValue, Section, StatusBadge } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Ph, Tbd } from '@/components/ui/placeholder'
import { formatDateTime } from '@/lib/utils'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Application submitted',
    path: '/register/submitted',
    noindex: true,
  })
}

export default async function RegistrationSubmittedPage() {
  const participant = await getCurrentParticipant()
  if (!participant) redirect('/sign-in?next=/portal')

  const [application, config] = await Promise.all([
    getParticipantApplication(participant.id),
    getEventConfig(),
  ])

  if (!application || application.status === 'DRAFT') redirect('/register')

  return (
    <Section className="py-14 sm:py-20">
      <div className="shell mx-auto max-w-3xl space-y-10">
        <header className="space-y-5">
          <span className="flex size-12 items-center justify-center rounded-full border border-success-500/40 bg-success-50 text-success-600">
            <CircleCheck className="size-6" aria-hidden="true" />
          </span>
          <Eyebrow>Application received</Eyebrow>
          <h1 className="font-display text-display-sm">APPLICATION SUBMITTED</h1>
          <p className="text-lg leading-relaxed text-ink-600">
            Your application has been received. Keep your reference safe — it is the fastest way for support to find your
            application.
          </p>
          <StatusBadge status={application.status} />
        </header>

        <Card>
          <CardBody className="pt-5">
            <dl className="divide-y divide-ink-100">
              <KeyValue label="Application reference">
                <span className="font-mono text-base tracking-wide text-ink-900">{application.reference}</span>
              </KeyValue>
              <KeyValue label="Status">
                <StatusBadge status={application.status} />
              </KeyValue>
              <KeyValue label="Submitted">
                {formatDateTime(application.submittedAt, config.text('event.timeZone')) ?? <Tbd label="SUBMITTED AT" />}
              </KeyValue>
              <KeyValue label="Next step">
                <Ph path="event.nextStepAfterSubmission" />
              </KeyValue>
              <KeyValue label="Event date">
                <Ph path="event.dateSummary" />
              </KeyValue>
              <KeyValue label="Time zone">
                <Ph path="event.timeZone" />
              </KeyValue>
            </dl>
          </CardBody>
        </Card>

        <Alert tone="info" title="Check your email for confirmation" icon={<Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}>
          <p>
            A confirmation has been generated for {participant.email}. If it has not arrived within 24 hours, check your
            spam folder, then contact support: <Ph path="contact.supportEmail" />.
          </p>
          {!config.text('contact.supportEmail') ? (
            <p className="mt-2">
              Support routes are still being published, so the fastest place to see updates is your participant portal.
            </p>
          ) : null}
        </Alert>

        <div className="flex flex-wrap gap-3">
          <LinkButton href="/portal" variant="primary" size="lg">
            View my registration
            <ArrowRight className="size-4" aria-hidden="true" />
          </LinkButton>
          <LinkButton href="/delegate-info" variant="secondary" size="lg">
            Delegate information
          </LinkButton>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <CardBody className="space-y-2">
              <h2 className="flex items-center gap-2 font-display text-lg text-ink-900">
                <CalendarClock className="size-4 meta" aria-hidden="true" />
                What happens next
              </h2>
              <p className="text-sm leading-relaxed text-ink-600">
                Allocation process: <Ph path="event.allocationProcess" />
              </p>
              <p className="text-xs meta">
                You will receive a decision by email, and your status always updates in your portal.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <h2 className="flex items-center gap-2 font-display text-lg text-ink-900">
                <ShieldCheck className="size-4 meta" aria-hidden="true" />
                Your privacy
              </h2>
              <p className="text-sm leading-relaxed text-ink-600">
                Your application is visible only to authorized organizers. Internal reviewer notes are never shown to
                applicants, and your details are never published or indexed.
              </p>
              <Link href="/policies/privacy-notice" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                Read the privacy notice
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </Section>
  )
}
