import Link from 'next/link'
import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EventConfig } from '@/lib/config'

/**
 * Only renders when an organizer has explicitly published a notice. There is no
 * fabricated urgency here: no seat counters, no countdowns, no invented
 * deadlines.
 */
export function AnnouncementBar({ config }: { config: EventConfig }) {
  if (!config.bool('announcement.enabled')) return null

  const message = config.text('announcement.message')
  const severity = config.text('announcement.severity') ?? 'info'
  const href = config.text('announcement.href')
  const Icon = severity === 'info' ? Info : TriangleAlert

  const tones = {
    info: 'border-brand-700 bg-brand-950 text-brand-100',
    important: 'border-warning-600 bg-warning-700 text-warning-50',
    critical: 'border-danger-600 bg-danger-700 text-danger-50',
  } as const

  const content = (
    <span className="flex items-center gap-3">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {message ? (
        <span className="text-sm">{message}</span>
      ) : (
        <span className="tbd" data-placeholder="ANNOUNCEMENT">
          [ANNOUNCEMENT — TBD]
        </span>
      )}
    </span>
  )

  return (
    <div
      className={cn('border-b', tones[(severity as keyof typeof tones) ?? 'info'])}
      role={severity === 'critical' ? 'alert' : 'status'}
    >
      <div className="shell flex min-h-11 items-center justify-center py-2 text-center">
        {href ? (
          <Link href={href} className="underline-offset-4 hover:underline">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
