import Link from 'next/link'
import { ArrowUpRight, Languages, Layers, Signal, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, badgeVariants } from '@/components/ui/primitives'
import { Tbd } from '@/components/ui/placeholder'
import { TiltSurface } from './tilt'
import type { Committee } from '@prisma/client'

/**
 * Committee availability is only stated when the organizer has actually set it.
 * A committee whose status is still undecided renders `[OPEN / CLOSED — TBD]`
 * rather than defaulting to "Open", which would be a claim we cannot support.
 */
const STATUS_COPY: Record<string, { label: string; tone: 'positive' | 'warning' | 'neutral' }> = {
  open: { label: 'Open', tone: 'positive' },
  waitlist: { label: 'Waitlist only', tone: 'warning' },
  closed: { label: 'Closed', tone: 'neutral' },
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-ink-400" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-2xs tracking-wider meta uppercase">{label}</p>
        <p className="mt-0.5 text-sm text-ink-800">
          {value ? value : <Tbd label={label.toUpperCase()} />}
        </p>
      </div>
    </div>
  )
}

export function CommitteeCard({
  committee,
  className,
  showPreferenceCta = true,
}: {
  committee: Committee & { assignedCount?: number }
  className?: string
  showPreferenceCta?: boolean
}) {
  const status = STATUS_COPY[committee.status]
  const seatsLeft =
    committee.capacity != null && committee.assignedCount != null
      ? Math.max(0, committee.capacity - committee.assignedCount)
      : null

  return (
    // Every committee card is a real 3D plane: the frame owns the perspective,
    // the card leans toward the pointer and settles back on exit. Pointer and
    // motion preferences are handled inside TiltSurface.
    <TiltSurface className={cn('h-full', className)} planeClassName="h-full rounded-xl" max={4} lift={8}>
      <Card as="article" interactive className="group flex h-full flex-col overflow-hidden">
      {/* Brass hairline that draws across the top of the card on hover. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent-400 transition-transform duration-[var(--dur-4)] ease-[var(--ease-out-expo)] group-hover:scale-x-100"
      />
      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="eyebrow text-brand-700">
              {committee.type ? committee.type : <Tbd label="COMMITTEE TYPE" />}
            </p>
            <h3 className="font-display text-xl leading-snug text-ink-900 transition-colors duration-300 group-hover:text-brand-800">
              {committee.name ? committee.name : <Tbd label="COMMITTEE NAME" />}
            </h3>
          </div>
          {status ? (
            <span className={cn(badgeVariants({ tone: status.tone }), 'shrink-0')}>{status.label}</span>
          ) : (
            <Tbd label="OPEN / CLOSED" className="shrink-0" />
          )}
        </div>

        <p className="text-sm leading-relaxed text-ink-600">
          {committee.topic ? (
            <>
              <span className="font-medium text-ink-700">Agenda: </span>
              {committee.topic}
            </>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink-700">Agenda:</span>
              <Tbd label="AGENDA / TOPIC" />
            </span>
          )}
        </p>

        {committee.isPlaceholder ? (
          <p className="texture-hatch rounded-md border border-dashed border-ink-300 bg-paper-sunk/60 px-3 py-2.5 text-xs leading-relaxed text-ink-600">
            Committee information coming soon — this entry is a placeholder until the organizing committee publishes
            the official committee list.
          </p>
        ) : null}

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={<Signal className="size-3.5" />} label="Experience level" value={committee.experienceLevel} />
          <Field icon={<Languages className="size-3.5" />} label="Language" value={committee.language} />
          <Field
            icon={<Users className="size-3.5" />}
            label="Capacity"
            value={committee.capacity != null ? String(committee.capacity) : null}
          />
          <Field
            icon={<Layers className="size-3.5" />}
            label="Seats remaining"
            value={seatsLeft != null ? String(seatsLeft) : null}
          />
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-200/70 px-5 py-4 sm:px-6">
        <Link
          href={`/committees/${committee.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition-colors hover:text-brand-800 hover:decoration-brand-700"
        >
          View committee
          <ArrowUpRight
            className="size-3.5 transition-transform duration-200 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
        {showPreferenceCta ? (
          <span className="ml-auto text-xs meta opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-sm:opacity-100">
            Add as a preference during registration
          </span>
        ) : null}
      </div>
      </Card>
    </TiltSurface>
  )
}

export function CommitteeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="space-y-4 p-5">
          <div className="shimmer h-3 w-20 rounded bg-ink-100" />
          <div className="shimmer h-5 w-2/3 rounded bg-ink-100" />
          <div className="shimmer h-3 w-full rounded bg-ink-100" />
          <div className="shimmer h-3 w-4/5 rounded bg-ink-100" />
        </Card>
      ))}
    </div>
  )
}
