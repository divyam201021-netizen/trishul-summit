import Link from 'next/link'
import { CalendarX2, Globe2, Info } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { listSchedule } from '@/lib/content/queries'
import { getEventConfig } from '@/lib/config'
import { Alert, Card, CardBody, EmptyState, Eyebrow, Section } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Ph, Tbd } from '@/components/ui/placeholder'
import { ScheduleSessionCard } from '@/components/site/schedule-session-card'
import { LocalTimeHint } from '@/components/site/local-time'
import { formatIsoDate } from '@/lib/utils'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Schedule',
    description:
      'Day-by-day programme with session types, start and end times, and an explicit canonical time zone for every session.',
    path: '/schedule',
  })
}

export default async function SchedulePage() {
  const [days, config] = await Promise.all([listSchedule(), getEventConfig()])
  const canonicalZone = config.text('event.timeZone')

  return (
    <>
      <Section className="pb-10 sm:pb-12">
        <div className="shell">
          <div className="max-w-3xl space-y-6">
            <Eyebrow>Programme</Eyebrow>
            <h1 className="font-display text-display">Schedule</h1>
            <p className="text-lg leading-relaxed text-ink-600">
              Every session lists its type, duration and the canonical event time zone. Times are never shown without a
              time zone, because an unlabelled time is a promise we cannot keep across the world.
            </p>
            <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-ink-200 pt-5">
              <div className="space-y-1">
                <p className="font-mono text-2xs tracking-wider meta uppercase">Canonical time zone</p>
                <p className="text-sm text-ink-800">
                  <Ph path="event.timeZone" />
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-2xs tracking-wider meta uppercase">Event date</p>
                <p className="text-sm text-ink-800">
                  <Ph path="event.dateSummary" />
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-2xs tracking-wider meta uppercase">Platform</p>
                <p className="text-sm text-ink-800">
                  <Ph path="platform.name" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="shell space-y-10">
          {!canonicalZone ? (
            <Alert tone="warning" title="The canonical time zone has not been published yet">
              The organizing committee has not confirmed the event time zone, so individual session times cannot be
              displayed. Publishing a time without its zone would be misleading, so we show{' '}
              <Tbd label="TIME ZONE" /> instead.
            </Alert>
          ) : null}

          {days.length ? (
            days.map((day) => (
              <section key={day.key} aria-labelledby={`day-${day.key}`} className="space-y-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-200 pb-4">
                  <h2 id={`day-${day.key}`} className="font-display text-2xl text-ink-900">
                    {day.label === '[DAY LABEL — TBD]' ? <Tbd label="DAY LABEL" /> : day.label}
                  </h2>
                  <p className="flex items-center gap-2 font-mono text-2xs tracking-wider meta uppercase">
                    <Globe2 className="size-3.5" aria-hidden="true" />
                    Time zone: {day.timeZone ?? <Tbd label="TIME ZONE" />}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {day.sessions.map((session) => (
                    <div key={session.id} className="space-y-2">
                      <ScheduleSessionCard session={session} dayTimeZone={day.timeZone} />
                      <LocalTimeHint
                        date={session.date ? formatIsoDate(session.date) : formatIsoDate(day.date)}
                        startTime={session.startTime}
                        endTime={session.endTime}
                        timeZone={session.timeZone ?? day.timeZone}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <EmptyState
              icon={<CalendarX2 className="size-5" aria-hidden="true" />}
              title="No schedule published yet"
              description={
                <>
                  The organizing committee has not published the programme. As soon as session details are confirmed
                  they appear here, grouped by day, with an explicit time zone on every session.{' '}
                  <Link href="/contact" className="underline underline-offset-2">
                    Contact the organizing committee
                  </Link>{' '}
                  if you need dates for planning.
                </>
              }
              action={
                <>
                  <LinkButton href="/register" variant="primary">
                    Register your interest
                  </LinkButton>
                  <LinkButton href="/committees" variant="secondary">
                    Explore committees
                  </LinkButton>
                </>
              }
            />
          )}

          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-display text-lg text-ink-900">How times are published</h2>
              <ul className="space-y-2 text-sm leading-relaxed text-ink-600">
                <li className="flex gap-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span>
                    The canonical event time zone is <Ph path="event.timeZone" />. This is the authoritative time for
                    every session.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span>
                    A local-time conversion may appear beneath a session as a convenience. It is derived from your own
                    device and never replaces the published time.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span>
                    Schedule changes are announced through the participant portal and by email, so you are never relying
                    on a stale page.
                  </span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  )
}
