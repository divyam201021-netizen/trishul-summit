import Link from 'next/link'
import { Briefcase, Camera, Globe, Mail, MessageSquare, ShieldCheck, Timer } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getEventConfig } from '@/lib/config'
import { Card, CardBody, CardHeader, CardTitle, Eyebrow, KeyValue, Section, SectionHeading } from '@/components/ui/primitives'
import { Tbd, PendingContent } from '@/components/ui/placeholder'
import { PageViewEvent } from '@/components/site/analytics-events'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Contact',
    description:
      'How to reach the Trishul Summit organizing committee: support email, support channel, response time and official social profiles.',
    path: '/contact',
  })
}

export default async function ContactPage() {
  const config = await getEventConfig()
  const supportEmail = config.text('contact.supportEmail')
  const supportChannel = config.text('contact.supportChannel')
  const supportResponse = config.text('contact.supportResponseTime')
  const instagram = config.text('contact.instagram')
  const linkedin = config.text('contact.linkedin')
  const other = config.text('contact.otherSocial')

  const hasDirectRoute = Boolean(supportEmail || supportChannel)

  return (
    <>
      <PageViewEvent event="support_contact" props={{ channel: 'page' }} />
      <Section className="pb-10 sm:pb-12">
        <div className="shell">
          <div className="max-w-3xl space-y-6">
            <Eyebrow>Contact</Eyebrow>
            <h1 className="font-display text-display">Talk to a person</h1>
            <p className="text-lg leading-relaxed text-ink-600">
              The organizing committee publishes its support routes here. We do not list contact details we cannot
              monitor, and a placeholder means the route is not open yet — not that it is broken.
            </p>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="shell grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
              <p className="text-xs meta">For applicants, accepted participants and committee queries</p>
            </CardHeader>
            <CardBody className="space-y-5">
              <dl className="divide-y divide-ink-100">
                <KeyValue label="Support email">
                  {supportEmail ? (
                    <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 text-brand-700 underline underline-offset-4">
                      <Mail className="size-3.5" aria-hidden="true" />
                      {supportEmail}
                    </a>
                  ) : (
                    <Tbd label="SUPPORT EMAIL" />
                  )}
                </KeyValue>
                <KeyValue label="Support channel">
                  {supportChannel ? (
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-ink-400" aria-hidden="true" />
                      {supportChannel}
                    </span>
                  ) : (
                    <Tbd label="SUPPORT CHANNEL" />
                  )}
                </KeyValue>
                <KeyValue label="Response time">
                  {supportResponse ? (
                    <span className="inline-flex items-center gap-2">
                      <Timer className="size-3.5 text-ink-400" aria-hidden="true" />
                      {supportResponse}
                    </span>
                  ) : (
                    <Tbd label="SUPPORT RESPONSE TIME" />
                  )}
                </KeyValue>
              </dl>

              {!hasDirectRoute ? (
                <PendingContent title="Support routes are being finalised" tone="warning">
                  No support email or channel has been published yet, so this page cannot route you to a person. Once
                  the organizing committee publishes either value, it appears here immediately. If you already have an
                  application, sign in to your portal — status information is always available there.
                </PendingContent>
              ) : null}

              <p className="text-xs leading-relaxed meta">
                Never send passwords, payment credentials or card details to support. Genuine organisers will never ask
                for them.
              </p>
            </CardBody>
          </Card>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Official profiles</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-3 text-sm">
                  <SocialRow icon={<Camera className="size-4" aria-hidden="true" />} label="Instagram" href={instagram} />
                  <SocialRow icon={<Briefcase className="size-4" aria-hidden="true" />} label="LinkedIn" href={linkedin} />
                  <SocialRow icon={<Globe className="size-4" aria-hidden="true" />} label="Other social" href={other} />
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organizer</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm text-ink-600">
                <p>
                  <Tbd label="ORGANIZER / INSTITUTION" />
                </p>
                <p className="text-xs meta">
                  The organizing institution is published once confirmed by the committee. Until then we do not claim an
                  affiliation we do not have.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 meta" aria-hidden="true" />
                  Already applied?
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm text-ink-600">
                <p>
                  Your application reference, status and next action are always available in your participant portal.
                  Quote the reference (<span className="font-mono">TRI-…</span>) when contacting support.
                </p>
                <Link href="/sign-in" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                  Sign in to my registration
                </Link>
              </CardBody>
            </Card>
          </div>
        </div>
      </Section>

      <Section surface="sunk" className="border-y border-ink-200 py-14">
        <div className="shell">
          <SectionHeading
            eyebrow="Before you write"
            title="The fastest routes to an answer"
            description="Most questions are already answered in these places."
            className="mb-8"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { title: 'Delegate information', href: '/delegate-info', body: 'Eligibility, requirements, fees, technical set-up.' },
              { title: 'FAQ', href: '/faq', body: 'Twelve common questions, each answered or explicitly pending.' },
              { title: 'Your portal', href: '/portal', body: 'Application status, next action and released event information.' },
            ].map((item) => (
              <Card key={item.href} interactive>
                <CardBody className="space-y-2">
                  <h3 className="font-display text-lg text-ink-900">
                    <Link href={item.href} className="link-underline">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-ink-600">{item.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}

function SocialRow({ icon, label, href }: { icon: React.ReactNode; label: string; href: string | null }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-ink-700">
        <span className="text-ink-400">{icon}</span>
        {label}
      </span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-brand-700 underline underline-offset-4">
          Visit
        </a>
      ) : (
        <Tbd label={label.toUpperCase()} />
      )}
    </li>
  )
}
