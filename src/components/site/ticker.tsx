import { cn } from '@/lib/utils'

/**
 * A printed strip that happens to move.
 *
 * This is not a carousel: nothing is hidden, nothing advances on a timer, and
 * no slide is ever out of view — every item is in the DOM, always readable, and
 * pausing costs nothing more than hovering (or focusing) the strip. The track
 * holds exactly two copies of the list so a −50% shift lands on an identical
 * frame and the loop is seamless; the duplicate is hidden from assistive
 * technology so the text is announced once.
 */
export function Ticker({
  items,
  label,
  className,
  duration = 54,
}: {
  items: string[]
  /** Announced name for the strip, e.g. "Platform commitments". */
  label: string
  className?: string
  /** Seconds per full pass. Slower is calmer; below ~30s starts to nag. */
  duration?: number
}) {
  if (!items.length) return null

  const track = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden ? true : undefined}>
      {items.map((item) => (
        <li key={item} className="flex shrink-0 items-center gap-6 pr-6">
          <span className="font-mono text-2xs tracking-[0.16em] whitespace-nowrap meta uppercase">{item}</span>
          <span className="ticker-sep" aria-hidden="true" />
        </li>
      ))}
    </ul>
  )

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('ticker ticker-fade py-3', className)}
      style={{ '--ticker-duration': `${duration}s` } as React.CSSProperties}
    >
      <div className="ticker-track">
        {track(false)}
        {track(true)}
      </div>
    </div>
  )
}
