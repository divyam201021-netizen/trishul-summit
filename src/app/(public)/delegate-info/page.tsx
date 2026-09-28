import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleDashed, ScrollText, ShieldCheck, Video } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getEventConfig } from '@/lib/config'
import { providerStatus } from '@/lib/payments'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Eyebrow,
  KeyValue,
  Section,
  SectionHeading,
} from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Ph, Tbd } from '@/components/ui/placeholder'
import { FeeSummary, PaymentNotice } from '@/components/site/fees'
import { TrackedLink } from '@/components/site/reveal'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Delegate Information',
    description:
      'Eligibility, age and experience requirements, the registration process, committee preferences, fees, technical requirements, conduct, privacy and support.',
    path: '/delegate-info',
  })
}

export default async function DelegateInfoPage() {
  const config = await getEventConfig()
  const provider = providerStatus()
  const items = config.list('registration.requiredItems')

  const checklist = [
    { label: 'Check the eligibility requirements', href: '#eligibility' },
    { label: 'Read the code of conduct', href: '/policies/code-of-conduct' },
    { label: 'Understand how committee preferences work', href: '#preferences' },
    { label: 'Review the technical requirements', href: '#technical' },
    { label: 'Know what the fee covers (or that it is still to be confirmed)', href: '#fees' },
    { label: 'Have your institution details ready', href: '#registration-process' },
    { label: 'Decide your first and second committee preferences', href: '/committees' },
  ]

  return (
    <>
      <Section className="pb-10 sm:pb-12">
        <div className="shell">
          <div className="max-w-3xl space-y-6">
            <Eyebrow>Delegate information</Eyebrow>
            <h1 className="font-display text-display">Before you register</h1>
            <p className="text-lg leading-relaxed text-ink-600">
              This page answers the practical questions: whether you are eligible, what you will be asked for, how
              committees are allocated, what it costs, and what you need in order to take part online.
            </p>
            <div className="flex flex-wrap gap-3">
              <TrackedLink event="registration_cta_clicked" props={{ location: 'delegate-info', label: 'register' }}>
                <LinkButton href="/register" variant="primary" size="lg">
                  Start registration
                  <ArrowRight className="size-4" aria-hidden="true" />
                </LinkButton>
              </TrackedLink>
              <LinkButton href="/committees" variant="secondary" size="lg">
                Browse committees
              </LinkButton>
            </div>
          </div>
        </div>
      </Section>

      {/* Visual checklist — the "before you register" moment */}
      <Section surface="sunk" className="border-y border-ink-200 py-14">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <SectionHeading
            eyebrow="Checklist"
            title="Seven things to settle first"
            description="Registration takes about the time shown below and can be paused — your draft is saved to your account."
          />
          <Card>
            <CardHeader>
              <CardTitle>Before you register</CardTitle>
              <p className="text-xs meta">
                Estimated completion time: {config.num('registration.estimatedMinutes') ?? 10} minutes
              </p>
            </CardHeader>
            <CardBody>
              <ol className="space-y-3">
                {checklist.map((item, index) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="text-sm text-ink-700">
                      <a href={item.href} className="link-underline">
                        {item.label}
                      </a>
                      <span className="sr-only"> (step {index + 1} of {checklist.length})</span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-6" id="eligibility">
            <SectionHeading eyebrow="Eligibility" title="Who can take part" />
            <dl className="divide-y divide-ink-100">
              <KeyValue label="Eligibility">
                <Ph path="event.eligibility" />
              </KeyValue>
              <KeyValue label="Age requirement">
                <Ph path="event.ageRequirement" />
              </KeyValue>
              <KeyValue label="Experience requirements">
                <Ph path="event.munExperiencePolicy" />
              </KeyValue>
              <KeyValue label="Format">
                <span className="inline-flex items-center gap-2">
                  <Video className="size-3.5 text-ink-400" aria-hidden="true" />
                  <Ph path="event.format" />
                </span>
              </KeyValue>
              <KeyValue label="Language(s)">
                {config.list('event.languages').length ? (
                  config.list('event.languages').join(' · ')
                ) : (
                  <Tbd label="LANGUAGE(S)" />
                )}
              </KeyValue>
              <KeyValue label="Participant categories">
                <ul className="flex flex-col gap-1">
                  {config.list('event.participantCategories').map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </KeyValue>
            </dl>

            <Alert tone="info" title="No MUN experience? That is normal here.">
              First-time participants are welcome. Model United Nations is a debate format, not a prerequisite —
              committees that require prior experience say so explicitly on their page.
            </Alert>
          </div>

          <div className="space-y-6" id="registration-process">
            <SectionHeading
              eyebrow="Registration"
              title="What the process looks like"
              description="Five steps, all online, with an application reference you can quote to support."
            />
            <Card>
              <CardHeader>
                <CardTitle>What you will be asked for</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                      <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card id="preferences" className="scroll-mt-24">
              <CardHeader>
                <CardTitle>Committee preferences</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
                <p>
                  You will rank your committee preferences during registration. Preferences are recorded in order and
                  are used by the allocation team, but they are not confirmed assignments while allocation is in
                  progress.
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="meta">Allocation process:</span>
                  <Ph path="event.allocationProcess" />
                </p>
                {!config.bool('event.preferencesGuaranteed') ? (
                  <p className="rounded-md border border-ink-200 bg-paper-sunk/60 px-3 py-2 text-xs text-ink-600">
                    Committee preferences are preferences, not guaranteed assignments.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </div>
      </Section>

      <Section surface="sunk" className="border-y border-ink-200" id="fees">
        <div className="shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <SectionHeading eyebrow="Fees" title="What it costs" />
            <FeeSummary config={config} compact />
          </div>
          <div className="space-y-5" id="technical">
            <SectionHeading eyebrow="Taking part" title="Technical requirements & conduct" />
            <Card>
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-display text-base text-ink-900">
                    <Video className="size-4 meta" aria-hidden="true" />
                    Platform
                  </h3>
                  <p className="text-sm text-ink-600">
                    <Ph path="platform.name" />
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-display text-base text-ink-900">
                    <ShieldCheck className="size-4 meta" aria-hidden="true" />
                    Technical requirements
                  </h3>
                  <p className="text-sm text-ink-600">
                    <Ph path="platform.technicalRequirements" />
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-display text-base text-ink-900">
                    <ScrollText className="size-4 meta" aria-hidden="true" />
                    Joining instructions
                  </h3>
                  <p className="text-sm text-ink-600">
                    <Ph path="platform.joiningInstructions" />
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-base text-ink-900">Code of conduct</h3>
                  <p className="text-sm text-ink-600">
                    All participants accept the code of conduct when they register.{' '}
                    <Link href="/policies/code-of-conduct" className="underline underline-offset-4">
                      Read the code of conduct
                    </Link>
                    .
                  </p>
                </div>
              </CardBody>
            </Card>
            <PaymentNotice />
          </div>
        </div>
      </Section>

      <Section className="py-14">
        <div className="shell grid gap-8 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>
                Your application data is used only to process your registration, allocate a committee and communicate
                with you about the summit. Optional marketing consent is separate and can be withdrawn at any time from
                your portal.
              </p>
              <Link href="/policies/privacy-notice" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                Read the privacy notice
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <dl className="space-y-3">
                <KeyValue label="Support email">
                  <Ph path="contact.supportEmail" />
                </KeyValue>
                <KeyValue label="Response time">
                  <Ph path="contact.supportResponseTime" />
                </KeyValue>
              </dl>
              <Link href="/contact" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                Contact support
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Accessibility</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>
                Registration is fully usable with a keyboard and a screen reader. If any part of the process is a
                barrier for you, support will complete it with you directly.
              </p>
              <Link href="/accessibility" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                Accessibility statement
              </Link>
            </CardBody>
          </Card>
        </div>
        {!provider.configured ? (
          <div className="shell mt-8">
            <Alert tone="neutral" title="Payment is not configured">
              Registration is submitted without a payment step. When payment details are published, accepted
              participants will be told exactly how to pay.
            </Alert>
          </div>
        ) : null}
      </Section>
    </>
  )
}
