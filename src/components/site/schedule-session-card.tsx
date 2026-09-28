import { Clock4, Globe, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, badgeVariants } from '@/components/ui/primitives'
import { Tbd } from '@/components/ui/placeholder'
import type { ScheduleSession } from '@prisma/client'

const SESSION_TYPES: Record<string, string> = {
  plenary: 'Plenary',
  committee: 'Committee session',
  workshop: 'Workshop',
  ceremony: 'Ceremony',
  break: 'Break',
}

/**
 * A session time is only rendered when the session has both times and an
 * explicit time zone. Otherwise the canonical-time-zone placeholder is shown —
 * an unlabelled time is worse than no time at all.
 */
export function ScheduleSessionCard({
  session,
  dayTimeZone,
  className,
}: {
  session: ScheduleSession & { committee?: { slug: string; name: string | null } | null }
  dayTimeZone?: string | null
  className?: string
}) {
  const timeZone = session.timeZone ?? dayTimeZone ?? null
  const hasTime = Boolean(session.startTime && session.endTime && timeZone)

  return (
    <Card as="article" className={cn('p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="eyebrow text-brand-700">
            {session.sessionType ? (SESSION_TYPES[session.sessionType] ?? session.sessionType) : <Tbd label="SESSION TYPE" />}
          </p>
          <h3 className="font-display text-lg leading-snug text-ink-900">
            {session.title ? session.title : <Tbd label="SESSION NAME" />}
          </h3>
        </div>
        {session.committee ? (
          <span className={cn(badgeVariants({ tone: 'outline' }))}>{session.committee.name ?? 'Committee'}</span>
        ) : null}
      </div>

      <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <dt className="flex items-center gap-1.5 meta">
            <Clock4 className="size-3.5" aria-hidden="true" />
            <span className="font-mono text-2xs tracking-wider uppercase">Time</span>
          </dt>
          <dd className="text-ink-800">
            {hasTime ? (
              <span className="tabular-nums">
                {session.startTime}–{session.endTime}
              </span>
            ) : (
              <Tbd label="START / END TIME" />
            )}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="flex items-center gap-1.5 meta">
            <Globe className="size-3.5" aria-hidden="true" />
            <span className="font-mono text-2xs tracking-wider uppercase">Time zone</span>
          </dt>
          <dd className="text-ink-800">{timeZone ? timeZone : <Tbd label="TIME ZONE" />}</dd>
        </div>
        {session.platform ? (
          <div className="flex items-center gap-2">
            <dt className="flex items-center gap-1.5 meta">
              <MapPin className="size-3.5" aria-hidden="true" />
              <span className="font-mono text-2xs tracking-wider uppercase">Where</span>
            </dt>
            <dd className="text-ink-800">{session.platform}</dd>
          </div>
        ) : null}
      </dl>

      {session.description ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{session.description}</p>
      ) : null}

      {hasTime ? (
        <p className="mt-3 text-xs meta">
          Times are published in the canonical event time zone ({timeZone}). Your own device may display a different
          local time.
        </p>
      ) : (
        <p className="mt-3 text-xs meta">
          This session cannot display a time yet: the organizing committee has not published a time zone. Session times
          are never shown without one.
        </p>
      )}
    </Card>
  )
}
