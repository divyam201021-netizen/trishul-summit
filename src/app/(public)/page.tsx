import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Compass,
  Globe2,
  Languages,
  LayoutList,
  ScrollText,
  ShieldCheck,
  Signal,
  Users,
  Video,
  Wifi,
} from 'lucide-react'
import { getEventConfig } from '@/lib/config'
import { getActiveSiteUrl, eventJsonLd } from '@/lib/seo'
import { listCommittees, listFaq, listSchedule } from '@/lib/content/queries'
import { providerStatus } from '@/lib/payments'
import { buildPageMetadata } from '@/lib/seo'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Eyebrow,
  Section,
  SectionHeading,
  badgeVariants,
} from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Ph, Tbd, PendingContent } from '@/components/ui/placeholder'
import { SummitMotif, TridentRule } from '@/components/site/motif'
import { SpotlightLayer } from '@/components/site/spotlight'
import { Magnetic, Parallax, ScrollScene } from '@/components/site/motion'
import { ArmillaryGlobe } from '@/components/site/armillary'
import { KineticHeading } from '@/components/site/kinetic'
import { Ticker } from '@/components/site/ticker'
import { TiltSurface } from '@/components/site/tilt'
import { Reveal, TrackedLink } from '@/components/site/reveal'
import { CommitteeCard } from '@/components/site/committee-card'
import { ScheduleSessionCard } from '@/components/site/schedule-session-card'
import { Journey } from '@/components/site/journey'
import { FaqList } from '@/components/site/faq-list'
import { FeeSummary, FeeFootnote } from '@/components/site/fees'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Trishul Summit — Online Model United Nations Summit',
    path: '/',
  })
}

export default async function HomePage() {
  const config = await getEventConfig()
  const [committees, schedule, faq] = await Promise.all([listCommittees(), listSchedule(), listFaq()])
  const provider = providerStatus()
  const siteUrl = getActiveSiteUrl(config)
  const wordmark = config.text('identity.wordmark') ?? 'TRISHUL SUMMIT'
  const languages = config.list('event.languages')
  const registrationStatus = config.text('identity.registrationStatusLabel') ?? 'TBD'
  const featured = committees.slice(0, 3)
  const firstDay = schedule[0]
  const previewSessions = firstDay?.sessions.slice(0, 3) ?? []

  return (
    <>
      <script
        type="application/ld+json"
        // Only confirmed values are emitted; unknown fields are omitted entirely.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(config, siteUrl)) }}
      />

      {/* ================= SECTION 1 — HERO ================= */}
      <section
        data-surface="ink"
        className="spotlight dark-band ink-canvas grain-dark relative overflow-hidden text-ink-100"
      >
        <SpotlightLayer />
        {/* Depth layers move at different rates against the page: the engraved
            motif slowest, the sphere slightly faster, so the band reads as a
            space rather than a picture. */}
        <Parallax depth={78} className="pointer-events-none absolute inset-0 opacity-50">
          <SummitMotif className="absolute -top-16 right-[-8%] w-[52rem] max-w-none" tone="dark" />
        </Parallax>
        {/* The signature 3D object — a wireframe meridian sphere drawn in real
            CSS 3D, with one brass node travelling its ecliptic. */}
        <Parallax depth={34} className="pointer-events-none absolute inset-0">
          <ArmillaryGlobe
            className="absolute top-2 right-[2%] hidden lg:block"
            size="clamp(17rem, 26vw, 28rem)"
          />
        </Parallax>
        {/* One warm horizon edge anchors the band instead of a gradient wash. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-400/45 to-transparent"
        />
        <div className="shell relative pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-36">
          <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-9">
              <div className="space-y-6">
                <div className="animate-rise flex flex-wrap items-center gap-4">
                  <Eyebrow tone="dark">Online Model United Nations · International summit platform</Eyebrow>
                  <span className={badgeVariants({ tone: 'dark' })}>
                    {registrationStatus === 'TBD' ? (
                      <Tbd label="OPEN / CLOSED / FULL" />
                    ) : (
                      <>
                        <span aria-hidden="true" className="relative flex size-1.5">
                          <span className="absolute inset-0 rounded-full bg-accent-400 animate-pulse-ring" />
                          <span className="relative size-1.5 rounded-full bg-accent-400" />
                        </span>
                        Registration {registrationStatus.toLowerCase()}
                      </>
                    )}
                  </span>
                </div>
                <KineticHeading
                  as="h1"
                  text={wordmark}
                  linePerWord
                  underlineLast
                  delay={110}
                  stagger={120}
                  className="wordmark text-display-2xl text-white"
                />
                <p className="lead animate-rise max-w-xl text-ink-300" style={{ animationDelay: '160ms' }}>
                  <Ph path="identity.tagline" />
                </p>
              </div>

              <dl
                className="animate-rise grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] sm:grid-cols-3"
                style={{ animationDelay: '240ms' }}
              >
                {[
                  {
                    icon: <CalendarDays className="size-4 text-accent-300" aria-hidden="true" />,
                    label: 'Date',
                    value: <Ph path="event.dateSummary" />,
                  },
                  {
                    icon: <Globe2 className="size-4 text-accent-300" aria-hidden="true" />,
                    label: 'Format',
                    value: <Ph path="event.format" />,
                  },
                  {
                    icon: <Compass className="size-4 text-accent-300" aria-hidden="true" />,
                    label: 'Time zone',
                    value: <Ph path="event.timeZone" />,
                  },
                ].map((item) => (
                  <div key={item.label} className="bevel-top flex flex-col gap-2 bg-ink-950/45 px-5 py-4">
                    <dt className="flex items-center gap-2 font-mono text-2xs tracking-[0.14em] text-ink-400 uppercase">
                      {item.icon}
                      {item.label}
                    </dt>
                    <dd className="text-sm leading-relaxed text-ink-200">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div
                className="animate-rise flex flex-wrap items-center gap-3"
                style={{ animationDelay: '320ms' }}
              >
                <Magnetic strength={7} tilt={1.2}>
                  <TrackedLink event="registration_cta_clicked" props={{ location: 'hero', label: 'register' }}>
                    <LinkButton href="/register" variant="brand" size="lg">
                      Register
                      <ArrowRight
                        className="size-4 transition-transform duration-200 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </LinkButton>
                  </TrackedLink>
                </Magnetic>
                <LinkButton href="/committees" variant="onDark" size="lg" className="border-white/20">
                  Explore committees
                </LinkButton>
              </div>

              <p className="flex max-w-xl items-start gap-2 font-mono text-2xs leading-relaxed tracking-wider text-ink-400 uppercase">
                <span aria-hidden="true" className="mt-1.5 block size-3 shrink-0 border border-dashed border-accent-400/60" />
                <span>
                  [OFFICIAL LOGO — PLACEHOLDER] · A typographic wordmark is used until the organizing committee
                  supplies an official logo file.
                </span>
              </p>
            </div>

            {/* What / who / when / how — the four questions answered immediately */}
            {/* A solid letterpress plate rather than frosted glass — the identity
                is printed matter, not an app surface. */}
            <TiltSurface
              className="animate-rise"
              planeClassName="rounded-lg"
              max={6}
              lift={14}
              mirroredTone
            >
            <Card
              className="framed bevel-top rounded-lg border-white/14 bg-ink-950/70"
              style={{ animationDelay: '400ms' }}
            >
              <CardHeader className="border-white/12">
                <Eyebrow tone="dark">At first glance</Eyebrow>
                <CardTitle className="text-white">The essentials</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                {[
                  {
                    icon: <ShieldCheck className="size-4" aria-hidden="true" />,
                    question: 'What is it?',
                    answer: (
                      <>
                        <Ph path="event.format" /> — an online Model United Nations summit where participants debate
                        global issues in committees.
                      </>
                    ),
                  },
                  {
                    icon: <Users className="size-4" aria-hidden="true" />,
                    question: 'Who can take part?',
                    answer: <Ph path="event.eligibility" />,
                  },
                  {
                    icon: <CalendarDays className="size-4" aria-hidden="true" />,
                    question: 'When is it?',
                    answer: (
                      <span className="flex flex-wrap items-center gap-2">
                        <Ph path="event.dateSummary" />
                        <span className="meta">·</span>
                        <Ph path="event.timeZone" />
                      </span>
                    ),
                  },
                  {
                    icon: <ArrowRight className="size-4" aria-hidden="true" />,
                    question: 'How do I join?',
                    answer: (
                      <>
                        Register, set committee preferences, and wait for the organizing committee to review your
                        application. Registration deadline: <Ph path="registration.deadline" />
                      </>
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.question}
                    className="group flex gap-3 border-b border-white/8 pb-4 transition-colors duration-300 last:border-b-0 last:pb-0 hover:border-accent-400/40"
                  >
                    <span className="mt-0.5 text-accent-300 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5">
                      {item.icon}
                    </span>
                    <div className="space-y-1">
                      <p className="font-mono text-2xs tracking-wider text-ink-400 uppercase">{item.question}</p>
                      <p className="text-sm leading-relaxed text-ink-200">{item.answer}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
            </TiltSurface>
          </div>
        </div>
      </section>

      {/* ================= SECTION 1B — COMMITMENTS STRIP ================= */}
      {/* A printed strip that happens to move. Nothing is hidden and nothing
          advances on a timer — it pauses on hover and stops entirely for
          reduced-motion users. */}
      <section className="border-b border-ink-200 bg-paper-sunk">
        <div className="shell">
          <Ticker
            label="Platform commitments"
            items={[
              'Online Model United Nations summit',
              'Committee preferences declared at registration',
              'Every application receives a decision',
              'Session times published with an explicit time zone',
              'Card details never requested or stored',
              'Unconfirmed details stay visibly labelled',
            ]}
          />
        </div>
      </section>

      {/* ================= SECTION 2 — AT A GLANCE ================= */}
      <section className="border-b border-ink-200 bg-paper-sunk/70">
        <div className="shell py-10 sm:py-12">
          <h2 className="sr-only">At a glance</h2>
          <dl className="masthead overflow-hidden rounded-sm bg-paper-raised">
            {[
              { label: 'Who can attend', icon: <Users className="size-4" aria-hidden="true" />, value: <Ph path="event.eligibility" /> },
              { label: 'Format', icon: <Globe2 className="size-4" aria-hidden="true" />, value: <Ph path="event.format" /> },
              { label: 'Date', icon: <CalendarDays className="size-4" aria-hidden="true" />, value: <Ph path="event.dateSummary" /> },
              {
                label: 'Language',
                icon: <Languages className="size-4" aria-hidden="true" />,
                value: languages.length ? languages.join(' · ') : <Tbd label="LANGUAGE(S)" />,
              },
              {
                label: 'Registration',
                icon: <ScrollText className="size-4" aria-hidden="true" />,
                value: registrationStatus === 'TBD' ? <Tbd label="OPEN / CLOSED / FULL" /> : registrationStatus,
              },
            ].map((item) => (
              <div key={item.label} className="masthead-cell group">
                <dt className="flex items-center gap-2 font-mono text-2xs tracking-[0.16em] meta uppercase">
                  <span className="text-ink-400 transition-colors duration-300 group-hover:text-accent-500">
                    {item.icon}
                  </span>
                  {item.label}
                </dt>
                <dd className="mt-2.5 font-display text-lg leading-snug text-ink-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ================= SECTION 3 — WHY TRISHUL ================= */}
      <Section figure="01">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Why Trishul"
                index="01"
                title={
                  <>
                    More Than a <span className="display-italic">Conference.</span>
                  </>
                }
                description={
                  <>
                    Trishul Summit is built as a working forum rather than a spectator event: participants research,
                    negotiate, draft and revise in committees, with the same discipline used in international
                    diplomacy.
                  </>
                }
              />
              <TridentRule />
              <PendingContent title="The approved value proposition is being finalised">
                Each block below is bound to a single configuration value. As soon as the organizing committee
                approves the wording it appears here — in one place, on every page.
              </PendingContent>
            </div>

            {/* Editorial rows, not a card grid: numbered, hairline-separated,
                with a brass marker that grows on hover. */}
            <ol className="border-t border-ink-200">
              {[
                { path: 'content.differentiator', label: 'Key differentiator', icon: <Signal className="size-4" aria-hidden="true" /> },
                { path: 'content.learningOutcome', label: 'Learning outcome', icon: <ScrollText className="size-4" aria-hidden="true" /> },
                { path: 'content.participantExperience', label: 'Participant experience', icon: <Users className="size-4" aria-hidden="true" /> },
                { path: 'content.leadershipOutcome', label: 'Leadership & diplomacy', icon: <Globe2 className="size-4" aria-hidden="true" /> },
              ].map((block, index) => (
                <Reveal
                  as="li"
                  key={block.path}
                  delay={index * 70}
                  className="editorial-row group border-b border-ink-200"
                >
                  <div className="flex items-start gap-5 py-7 pl-4 sm:gap-8 sm:pl-6">
                    <span className="index-numeral pt-0.5 tabular-nums group-hover:text-accent-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-ink-400 transition-colors duration-300 group-hover:text-accent-500">
                          {block.icon}
                        </span>
                        <h3 className="font-display text-xl text-ink-900">{block.label}</h3>
                      </div>
                      <p className="measure text-sm leading-relaxed text-ink-600 sm:text-base">
                        <Ph path={block.path} />
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* ================= SECTION 4 — FEATURED COMMITTEES ================= */}
      <Section surface="sunk" figure="02" className="border-y border-ink-200">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Committees"
              index="02"
              title="Where the debate happens"
              description="Every committee is a distinct agenda, experience level, language and capacity. Availability shown here is the published availability — nothing is invented to create urgency."
            />
            <LinkButton href="/committees" variant="secondary">
              View all committees
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>

          <div className="mt-12">
            {featured.length ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {featured.map((committee, index) => (
                  <Reveal key={committee.id} delay={index * 60}>
                    <CommitteeCard committee={committee} className="h-full" />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <Card key={index} as="article" className="flex h-full flex-col">
                    <CardBody className="flex-1 space-y-4">
                      <Eyebrow>
                        <Tbd label="COMMITTEE TYPE" />
                      </Eyebrow>
                      <p className="font-display text-xl text-ink-800">
                        <Tbd label="COMMITTEE NAME" />
                      </p>
                      <p className="text-sm leading-relaxed text-ink-600">
                        <span className="font-medium text-ink-700">Agenda: </span>
                        <Tbd label="AGENDA / TOPIC" />
                      </p>
                      <div className="rounded-md border border-dashed border-ink-300 bg-paper-sunk/70 px-3 py-2.5 text-xs leading-relaxed text-ink-600">
                        Committee information coming soon. The organizing committee has not published the official
                        committee list yet.
                      </div>
                    </CardBody>
                    <div className="border-t border-ink-200/70 px-5 py-4">
                      <Link href="/committees" className="text-sm font-medium text-brand-700 underline underline-offset-4">
                        View committee directory
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ================= SECTION 5 — HOW IT WORKS ================= */}
      <Section figure="03">
        <div className="shell">
          <SectionHeading
            eyebrow="How it works"
            index="03"
            title="From first look to your first session"
            description="Five steps, fully online, with a person behind every message. Committee preferences are preferences — they are not guaranteed assignments unless the organizing committee says otherwise."
            className="mb-14"
          />
          <Journey
            steps={[
              { index: '01', title: 'Discover', body: 'Explore the summit, committees, schedule and requirements.' },
              { index: '02', title: 'Register', body: 'Submit your application and committee preferences.' },
              {
                index: '03',
                title: 'Review & allocation',
                body: <Ph path="event.allocationProcess" />,
              },
              { index: '04', title: 'Prepare', body: 'Receive your committee, instructions and event information.' },
              { index: '05', title: 'Participate', body: 'Join the summit and take part in the experience.' },
            ]}
          />
        </div>
      </Section>

      {/* ================= SECTION 6 — SCHEDULE PREVIEW ================= */}
      <Section surface="sunk" figure="04" className="border-y border-ink-200">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Programme"
              index="04"
              title="Schedule preview"
              description="Session times are always published together with an explicit time zone so nobody has to guess whether a time is theirs or the event's."
            />
            <LinkButton href="/schedule" variant="secondary">
              View full schedule
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>

          <div className="mt-12">
            {previewSessions.length ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-display text-xl text-ink-900">{firstDay?.label}</h3>
                  <span className="font-mono text-2xs tracking-wider meta uppercase">
                    Time zone: {firstDay?.timeZone ?? '[TIME ZONE — TBD]'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {previewSessions.map((session) => (
                    <ScheduleSessionCard key={session.id} session={session} dayTimeZone={firstDay?.timeZone} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<LayoutList className="size-5" aria-hidden="true" />}
                title="No schedule published yet"
                description={
                  <>
                    The organizing committee has not published the programme. Dates and session times appear here as
                    soon as they are confirmed — and never before, because we do not publish times we cannot stand
                    behind. <Link href="/schedule" className="underline underline-offset-2">Open the schedule page</Link> for
                    updates.
                  </>
                }
              />
            )}
          </div>
        </div>
      </Section>

      {/* ================= SECTION 7 — FEES ================= */}
      <Section figure="05">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Fees"
                index="05"
                title="Transparent, or clearly not yet decided"
                description={
                  <>
                    There are no invented prices on this platform. If a fee is shown, it is the amount the organizing
                    committee published. {!provider.configured ? 'Until payment is configured, checkout stays disabled.' : ''}
                  </>
                }
              />
              <FeeFootnote />
              <ul className="space-y-3 text-sm text-ink-600">
                <li className="flex gap-3">
                  <CircleDollarSign className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span>
                    Registration is submitted without any payment step{provider.configured ? '' : ' while payment is unconfigured'}.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span>Card details are never requested, transmitted or stored on this site.</span>
                </li>
                <li className="flex gap-3">
                  <ScrollText className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span>
                    Refunds follow the published policy: <Ph path="fees.refundPolicy" />
                  </span>
                </li>
              </ul>
            </div>
            <FeeSummary config={config} />
          </div>
        </div>
      </Section>

      {/* ================= SECTION 8 — PARTICIPANT PREPARATION ================= */}
      <Section surface="sunk" figure="06" className="border-y border-ink-200">
        <div className="shell">
          <SectionHeading
            eyebrow="Preparation"
            index="06"
            title="What you need before you join"
            description="Everything below is published from the organizer workspace. Where a value is still unknown, it is labelled as such rather than guessed."
          />

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: <Video className="size-4" aria-hidden="true" />, title: 'Online platform', path: 'platform.name' },
              { icon: <Wifi className="size-4" aria-hidden="true" />, title: 'Technical requirements', path: 'platform.technicalRequirements' },
              { icon: <ScrollText className="size-4" aria-hidden="true" />, title: 'Joining instructions', path: 'platform.joiningInstructions' },
            ].map((item) => (
              <Card key={item.path} className="h-full">
                <CardBody className="space-y-3">
                  <span className="flex size-9 items-center justify-center rounded-full border border-ink-300 text-ink-600">
                    {item.icon}
                  </span>
                  <h3 className="font-display text-lg text-ink-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-600">
                    <Ph path={item.path} />
                  </p>
                </CardBody>
              </Card>
            ))}

            <Card className="h-full">
              <CardBody className="space-y-3">
                <span className="flex size-9 items-center justify-center rounded-full border border-ink-300 text-ink-600">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <h3 className="font-display text-lg text-ink-900">Code of conduct</h3>
                <p className="text-sm leading-relaxed text-ink-600">
                  Participation is governed by the code of conduct, which sets out the standard of behaviour expected in
                  every committee and channel.
                </p>
                <Link href="/policies/code-of-conduct" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                  View Code of Conduct
                </Link>
              </CardBody>
            </Card>

            <Card className="h-full">
              <CardBody className="space-y-3">
                <span className="flex size-9 items-center justify-center rounded-full border border-ink-300 text-ink-600">
                  <Users className="size-4" aria-hidden="true" />
                </span>
                <h3 className="font-display text-lg text-ink-900">Support</h3>
                <dl className="space-y-2 text-sm text-ink-600">
                  <div>
                    <dt className="font-mono text-2xs tracking-wider meta uppercase">Channel</dt>
                    <dd>
                      <Ph path="contact.supportChannel" />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-2xs tracking-wider meta uppercase">Response time</dt>
                    <dd>
                      <Ph path="contact.supportResponseTime" />
                    </dd>
                  </div>
                </dl>
                <Link href="/contact" className="inline-flex text-sm font-medium text-brand-700 underline underline-offset-4">
                  Contact the organizing committee
                </Link>
              </CardBody>
            </Card>
          </div>
        </div>
      </Section>

      {/* ================= SECTION 9 — FAQ ================= */}
      <Section figure="07">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <SectionHeading
                eyebrow="FAQ"
                index="07"
                title="Questions people actually ask"
                description="Twelve questions cover registration, committees, fees and support. Anything the organizing committee has not answered yet stays visibly marked as to be confirmed."
              />
              <LinkButton href="/faq" variant="secondary">
                Open full FAQ
                <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
            </div>
            <FaqList items={faq.slice(0, 6)} withSearch={false} />
          </div>
        </div>
      </Section>

      {/* ================= SECTION 10 — FINAL CTA ================= */}
      {/* Scroll scene: the prongs of the motif draw themselves with scroll
          position rather than on arrival, so the band finishes as it is read. */}
      <ScrollScene>
      <section data-surface="ink" className="dark-band ink-canvas grain-dark relative overflow-hidden text-ink-100">
        <Parallax depth={54} className="pointer-events-none absolute inset-0 opacity-45">
          <SummitMotif
            className="absolute bottom-[-30%] left-[-10%] w-[40rem] max-w-none"
            tone="dark"
            scrub
          />
        </Parallax>
        <div className="shell relative py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl space-y-8">
            <Eyebrow tone="dark" className="eyebrow-num" data-index="08">
              Registration
            </Eyebrow>
            <KineticHeading
              as="h2"
              text="YOUR SUMMIT STARTS HERE."
              stagger={92}
              className="wordmark text-display text-white"
            />
            <TridentRule tone="dark" />
            <p className="lead max-w-xl text-ink-300">
              <Ph path="content.finalCtaCopy" />
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TrackedLink event="registration_cta_clicked" props={{ location: 'final-cta', label: 'register' }}>
                <LinkButton href="/register" variant="brand" size="lg">
                  Register for Trishul
                  <ArrowRight
                    className="size-4 transition-transform duration-200 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </LinkButton>
              </TrackedLink>
              <LinkButton href="/committees" variant="onDark" size="lg" className="border-white/15">
                Explore committees
              </LinkButton>
            </div>
            <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/12 pt-6">
              <div className="space-y-1">
                <dt className="font-mono text-2xs tracking-wider text-ink-400 uppercase">Registration deadline</dt>
                <dd className="text-sm text-ink-200">
                  <Ph path="registration.deadline" />
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="font-mono text-2xs tracking-wider text-ink-400 uppercase">Registration status</dt>
                <dd className="text-sm text-ink-200">
                  {registrationStatus === 'TBD' ? <Tbd label="OPEN / CLOSED / FULL" /> : registrationStatus}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="font-mono text-2xs tracking-wider text-ink-400 uppercase">Fee</dt>
                <dd className="text-sm text-ink-200">
                  <Ph path="fees.registrationFee" />
                </dd>
              </div>
            </dl>
            <p className={`inline-flex ${badgeVariants({ tone: 'dark' })}`}>
              Applications are reviewed by the organizing committee — every applicant receives a decision
            </p>
          </div>
        </div>
      </section>
      </ScrollScene>
    </>
  )
}
