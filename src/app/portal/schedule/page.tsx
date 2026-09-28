import Link from 'next/link'
import { CalendarX2, Globe2, Info } from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { getParticipantProfile } from '@/lib/applications/queries'
import { listSchedule } from '@/lib/content/queries'
import { getEventConfig } from '@/lib/config'
import { formatIsoDate } from '@/lib/utils'
import {
  Alert,
  Breadcrumbs,
  Card,
  CardBody,
  EmptyState,
  EMPTY_STATE_ICONS,
  SectionHeading,
} from '@/components/ui/primitives'
import { PendingContent, Tbd } from '@/components/ui/placeholder'
import { ScheduleSessionCard } from '@/components/site/schedule-session-card'
import { LocalTimeHint } from '@/components/site/local-time'

/**
 * Participant view of the programme. Identical integrity rules as the public
 * schedule: no time is displayed without an explicit time zone, and the
 * canonical time is never replaced by a converted local time.
 */
export default async function PortalSchedulePage() {
  const participant = await requireParticipant('/portal/schedule')
  const [days, config, profile] = await Promise.all([
    listSchedule(),
    getEventConfig(),
    getParticipantProfile(participant.id),
  ])

  const canonicalZone = config.text('event.timeZone')
  const myZone = profile?.timeZone ?? null

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Portal', href: '/portal' }, { label: 'Schedule' }]} />

      <SectionHeading
        as="h1"
        eyebrow="Programme"
        title="Schedule"
        description="Sessions are grouped by day and always carry the canonical event time zone. Where a local conversion is possible, it is shown as a courtesy — the published time is the one that counts."
      />

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="eyebrow meta">Event date</p>
            <p className="text-sm text-ink-800">{config.text('event.dateSummary') ?? <Tbd label="EVENT DATE" />}</p>
          </div>
          <div className="space-y-1">
            <p className="eyebrow meta">Canonical time zone</p>
            <p className="inline-flex items-center gap-1.5 text-sm text-ink-800">
              <Globe2 className="size-3.5 text-ink-400" aria-hidden="true" />
              {canonicalZone ?? <Tbd label="TIME ZONE" />}
            </p>
          </div>
          <div className="space-y-1">
            <p className="eyebrow meta">Your time zone</p>
            <p className="text-sm text-ink-800">
              {myZone ?? <span className="meta">Not recorded — you can set it from your application page.</span>}
            </p>
          </div>
        </CardBody>
      </Card>

      {canonicalZone && myZone && canonicalZone !== myZone ? (
        <Alert tone="info" title="Times may look different on your device">
          You told us you will be in <strong className="font-medium">{myZone}</strong> while the summit runs in{' '}
          <strong className="font-medium">{canonicalZone}</strong>. Converted times are shown as a courtesy below; if the
          two ever disagree, the canonical time is the official one.
        </Alert>
      ) : null}

      {!canonicalZone ? (
        <Alert tone="warning" title="Session times cannot be displayed yet">
          The organizing committee has not published the event time zone. Session times are never shown without one,
          because an unlabelled time is misleading across the world.
        </Alert>
      ) : null}

      {days.length ? (
        <div className="space-y-8">
          {days.map((day) => {
            const isoDate = day.date ? formatIsoDate(day.date) : null
            return (
              <section key={day.key} aria-labelledby={`portal-day-${day.key}`} className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-200 pb-3">
                  <h2 id={`portal-day-${day.key}`} className="font-display text-2xl text-ink-900">
                    {day.label === '[DAY LABEL — TBD]' ? <Tbd label="DAY LABEL" /> : day.label}
                  </h2>
                  <p className="font-mono text-2xs tracking-wider meta uppercase">
                    Time zone: {day.timeZone ?? <Tbd label="TIME ZONE" />}
                  </p>
                </div>

                <ul className="space-y-4">
                  {day.sessions.map((session) => (
                    <li key={session.id} className="space-y-2">
                      <ScheduleSessionCard session={session} dayTimeZone={day.timeZone} />
                      <LocalTimeHint
                        date={isoDate}
                        startTime={session.startTime}
                        endTime={session.endTime}
                        timeZone={session.timeZone ?? day.timeZone}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <EmptyState
            icon={<EMPTY_STATE_ICONS.noSchedule className="size-5" aria-hidden="true" />}
            title="The programme has not been published yet"
            description={
              <>
                Nothing has been scheduled publicly so far. We announce the programme once it is confirmed rather than
                publishing a provisional timetable people might plan around.
              </>
            }
          />
          <PendingContent title="[PROGRAMME — TBD]">
            When the schedule is published you will find every session here, plus a note in your email. In the meantime,{' '}
            <Link href="/portal/preparation" className="underline underline-offset-2">
              work through the preparation section
            </Link>
            .
          </PendingContent>
        </>
      )}

      <Card>
        <CardBody className="flex items-start gap-3 text-sm leading-relaxed text-ink-600">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
          <p>
            Sessions outside your committee still matter: plenaries, ceremonies and workshops are part of the summit
            experience. Committee sessions are marked with the committee they belong to.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
