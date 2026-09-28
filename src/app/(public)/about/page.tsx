import Link from 'next/link'
import { ArrowRight, BookOpen, Compass, Globe2, GraduationCap, MessageSquare, Users } from 'lucide-react'
import { getEventConfig } from '@/lib/config'
import { buildPageMetadata } from '@/lib/seo'
import { Card, CardBody, Eyebrow, Section, SectionHeading } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Ph, PendingContent } from '@/components/ui/placeholder'
import { AccentRule, OrbitMark } from '@/components/site/motif'
import { Reveal } from '@/components/site/reveal'

export async function generateMetadata() {
  const config = await getEventConfig()
  return buildPageMetadata({
    title: 'About',
    description:
      config.text('identity.shortDescription') ??
      'What Trishul Summit is, who it is for, and what participants can expect from an online Model United Nations summit.',
    path: '/about',
  })
}

const SECTIONS = [
  {
    id: 'mission',
    icon: <Compass className="size-4" aria-hidden="true" />,
    title: 'Mission',
    path: 'content.mission',
    fallback:
      'The mission statement is being finalised by the organizing committee. It will describe the purpose of the summit in the committee’s own words.',
  },
  {
    id: 'who',
    icon: <Users className="size-4" aria-hidden="true" />,
    title: 'Who it is for',
    path: 'content.whoItsFor',
    fallback:
      'Eligibility and audience description are configuration values: [ELIGIBILITY — TBD] for the current edition.',
  },
  {
    id: 'expect',
    icon: <BookOpen className="size-4" aria-hidden="true" />,
    title: 'What participants can expect',
    path: 'content.whatToExpect',
    fallback: 'The participant-facing expectations are awaiting approval before publication.',
  },
  {
    id: 'online',
    icon: <Globe2 className="size-4" aria-hidden="true" />,
    title: 'The online experience',
    path: 'content.onlineExperience',
    fallback: 'The description of the online experience is awaiting approval.',
  },
  {
    id: 'outcomes',
    icon: <GraduationCap className="size-4" aria-hidden="true" />,
    title: 'Learning outcomes',
    path: 'content.learningOutcome',
    fallback: 'Learning outcomes are awaiting approval.',
  },
  {
    id: 'why',
    icon: <MessageSquare className="size-4" aria-hidden="true" />,
    title: 'Why participate',
    path: 'content.whyParticipate',
    fallback: 'This section is awaiting approved wording from the organizing committee.',
  },
]

export default async function AboutPage() {
  const config = await getEventConfig()
  const wordmark = config.text('identity.wordmark') ?? 'TRISHUL SUMMIT'

  return (
    <>
      <Section className="pb-10 sm:pb-12">
        <div className="shell">
          <div className="max-w-4xl space-y-8">
            <Eyebrow>About the summit</Eyebrow>
            <h1 className="font-display text-display">
              What is <span className="whitespace-nowrap">{wordmark}</span>?
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-600">
              <Ph path="content.aboutIntro" />
            </p>
            <AccentRule />
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { label: 'Format', path: 'event.format' },
                { label: 'Date', path: 'event.dateSummary' },
                { label: 'Time zone', path: 'event.timeZone' },
              ].map((item) => (
                <div key={item.path} className="space-y-2">
                  <p className="font-mono text-2xs tracking-[0.14em] meta uppercase">{item.label}</p>
                  <p className="text-sm text-ink-800">
                    <Ph path={item.path} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Editorial statement rather than a wall of text */}
      <Section surface="ink" className="py-14 sm:py-16">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <blockquote className="space-y-6">
              <p className="font-display text-2xl leading-snug text-white sm:text-3xl">
                “Model United Nations asks participants to argue positions they did not choose, and to do it with
                evidence, courtesy and precision.”
              </p>
              <footer className="font-mono text-2xs tracking-wider text-ink-400 uppercase">
                How MUN works — explained for first-time participants
              </footer>
            </blockquote>
            <dl className="grid gap-6 sm:grid-cols-2">
              {[
                { term: 'Delegate', detail: 'A participant representing a country or body in a committee.' },
                { term: 'Committee', detail: 'A room of delegates debating one agenda topic.' },
                { term: 'Agenda', detail: 'The specific question a committee is asked to resolve.' },
                { term: 'Position paper', detail: 'A short written statement of the position you will defend.' },
              ].map((item) => (
                <div key={item.term} className="space-y-2 border-t border-white/12 pt-4">
                  <dt className="font-display text-lg text-white">{item.term}</dt>
                  <dd className="text-sm leading-relaxed text-ink-400">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section>
        <div className="shell">
          <SectionHeading
            eyebrow="In detail"
            title="Mission, audience and experience"
            description="Each section below is a single approved content block. Nothing is paraphrased into claims the organizing committee has not made."
            className="mb-12"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {SECTIONS.map((section, index) => (
              <Reveal key={section.id} delay={index * 50}>
                <Card id={section.id} className="h-full scroll-mt-28">
                  <CardBody className="space-y-4">
                    <div className="flex items-center gap-3">
                      <OrbitMark index={index + 1} />
                      <h2 className="font-display text-xl text-ink-900">{section.title}</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-600">
                      <Ph path={section.path} />
                    </p>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>

          <div className="mt-10">
            <PendingContent title="These sections are placeholders by design">
              Every block above reads from one configuration value in the organizer workspace. Replace it once and the
              About page, homepage and social previews all update together.
            </PendingContent>
          </div>
        </div>
      </Section>

      <Section surface="sunk" className="border-y border-ink-200">
        <div className="shell">
          <SectionHeading
            eyebrow="Next"
            title="Ready to take part?"
            description="Registration captures your details and committee preferences. You can return to your application at any time before submitting it."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/register" variant="primary" size="lg">
              Register
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
            <LinkButton href="/delegate-info" variant="secondary" size="lg">
              Delegate information
            </LinkButton>
          </div>
          <p className="mt-6 text-sm text-ink-600">
            Questions first? <Link href="/contact" className="underline underline-offset-4">Contact the organizing committee</Link>.
          </p>
        </div>
      </Section>
    </>
  )
}
