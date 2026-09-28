import Link from 'next/link'
import { CircleHelp, LifeBuoy, Mail, MessageSquare, ShieldAlert, TriangleAlert } from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { getEventConfig } from '@/lib/config'
import { statusMeta } from '@/lib/registration/status'
import { getParticipantApplication, getParticipantProfile } from '@/lib/applications/queries'
import {
  Alert,
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
 * Support route. The organizing committee's contact details are configuration,
 * not hard-coded: until they are supplied this page states clearly what is
 * missing rather than offering a generic form that goes nowhere.
 */
export default async function PortalSupportPage() {
  const participant = await requireParticipant('/portal/support')
  const [config, application, profile] = await Promise.all([
    getEventConfig(),
    getParticipantApplication(participant.id),
    getParticipantProfile(participant.id),
  ])

  const email = config.text('contact.supportEmail')
  const channel = config.text('contact.supportChannel')
  const responseTime = config.text('contact.supportResponseTime')
  const meta = application ? statusMeta(application.status) : null

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Portal', href: '/portal' }, { label: 'Support' }]} />

      <SectionHeading
        as="h1"
        eyebrow="Support"
        title="Talk to a person"
        description="Questions about your application, your allocation, the fee or the platform are answered by the organizing committee. Nothing here is a bot."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Mail className="size-4 meta" aria-hidden="true" />
                Contact the organizing committee
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <dl>
                <KeyValue label="Support email">
                  {email ? (
                    <a href={`mailto:${email}`} className="link-underline text-brand-700">
                      {email}
                    </a>
                  ) : (
                    <Tbd label="SUPPORT EMAIL" />
                  )}
                </KeyValue>
                <KeyValue label="Support channel">
                  {channel ?? <Tbd label="SUPPORT CHANNEL" />}
                </KeyValue>
                <KeyValue label="Typical response time">
                  {responseTime ?? <Tbd label="SUPPORT RESPONSE TIME" />}
                </KeyValue>
              </dl>

              {!email && !channel ? (
                <PendingContent title="Support contact details are not published yet" tone="warning">
                  The organizing committee has not published the address participants should write to. When it does, this
                  page updates automatically — nothing here needs a redesign. If your query is urgent, the{' '}
                  <Link href="/contact" className="underline underline-offset-2">
                    contact page
                  </Link>{' '}
                  lists whatever channels are already live.
                </PendingContent>
              ) : null}

              <div className="rounded-lg border border-ink-200 bg-paper-sunk/60 p-4">
                <p className="eyebrow meta">When you write, include</p>
                <ul className="mt-2.5 space-y-1.5 text-sm text-ink-700">
                  <li>
                    Your application reference{' '}
                    {application ? (
                      <span className="font-mono text-xs text-ink-800">{application.reference}</span>
                    ) : null}{' '}
                    — in the message body, not a link.
                  </li>
                  <li>The name you registered with{profile ? <> ({profile.fullName})</> : null}.</li>
                  <li>One sentence describing the decision or instruction you are asking about.</li>
                </ul>
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed meta">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  The organizing committee will never ask you for a password, a one-time code, or full card details. Treat
                  any message that does as fraudulent and report it.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <MessageSquare className="size-4 meta" aria-hidden="true" />
                Common questions answered without waiting for a reply
              </CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink-900">Where is my application?</p>
                <p className="text-sm leading-relaxed text-ink-600">
                  The dashboard shows your status and exactly what it means{meta ? <> — currently “{meta.label}”</> : null}.
                </p>
                <Link href="/portal" className="link-underline text-sm text-brand-700">
                  Open the dashboard
                </Link>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink-900">When is my committee released?</p>
                <p className="text-sm leading-relaxed text-ink-600">
                  Allocations are released when your status becomes Confirmed. The committee page explains the process.
                </p>
                <Link href="/portal/committee" className="link-underline text-sm text-brand-700">
                  Committee information
                </Link>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink-900">How do I pay?</p>
                <p className="text-sm leading-relaxed text-ink-600">
                  No payment is collected until the fee, method and refund policy are published. Until then the portal
                  shows <span className="font-mono text-xs">[PAYMENT DETAILS — TBD]</span>.
                </p>
                <Link href="/portal/application" className="link-underline text-sm text-brand-700">
                  Fee status
                </Link>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink-900">I need to correct my details</p>
                <p className="text-sm leading-relaxed text-ink-600">
                  Country, time zone, institution and language can be edited while your application is still editable.
                </p>
                <Link href="/portal/application" className="link-underline text-sm text-brand-700">
                  Edit my application
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <ShieldAlert className="size-4 meta" aria-hidden="true" />
                Report a conduct or safety concern
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>
                Concerns about behaviour in any summit space are handled separately from application queries. The Code of
                Conduct sets out what is expected and what happens when it is not met.
              </p>
              <div className="flex flex-wrap gap-3">
                <LinkButton href="/policies/code-of-conduct" variant="secondary" size="sm">
                  Read the Code of Conduct
                </LinkButton>
                <LinkButton href="/accessibility" variant="ghost" size="sm">
                  Accessibility statement
                </LinkButton>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <CircleHelp className="size-4 meta" aria-hidden="true" />
                Answer it yourself
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-ink-600">
              <p>
                The FAQ covers participation, eligibility, dates, online participation, registration, allocation, fees and
                support — with answers that are pending clearly marked rather than guessed.
              </p>
              <LinkButton href="/faq" variant="secondary" size="sm">
                Read the FAQ
              </LinkButton>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <TriangleAlert className="size-4 meta" aria-hidden="true" />
                Something is broken
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>
                If a page fails to load or a save does not go through, tell us the page and roughly what you were doing.
                Never send a screenshot that includes your application reference.
              </p>
              {email ? (
                <LinkButton href={`mailto:${email}`} variant="secondary" size="sm">
                  <Mail className="size-3.5" aria-hidden="true" />
                  Email the organizing committee
                </LinkButton>
              ) : (
                <Tbd label="SUPPORT EMAIL" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <LifeBuoy className="size-4 meta" aria-hidden="true" />
                Policies
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/policies/privacy-notice" className="link-underline text-brand-700">
                    Privacy Notice
                  </Link>
                </li>
                <li>
                  <Link href="/policies/participation-terms" className="link-underline text-brand-700">
                    Terms of Participation
                  </Link>
                </li>
                <li>
                  <Link href="/policies/cancellation-refund-policy" className="link-underline text-brand-700">
                    Cancellation / Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="link-underline text-brand-700">
                    Accessibility
                  </Link>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      {!responseTime ? (
        <Alert tone="neutral" title="Response time is not published yet">
          The organizing committee has not published how quickly it replies. We show that gap rather than promise a
          turnaround we cannot keep.
        </Alert>
      ) : null}
    </div>
  )
}
