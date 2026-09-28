import { cn } from '@/lib/utils'

/**
 * Abstract geometry only — this is deliberately NOT a logo. It suggests summit
 * lines, meridian arcs and the three converging prongs of a trishul without
 * asserting any official brand mark. An official logo file replaces the
 * wordmark once the organizer supplies one.
 *
 * Movement is ambient and one-pass: the meridian ring drifts, the prongs draw
 * themselves once on entry, and both stop entirely under
 * `prefers-reduced-motion` (handled in globals.css).
 */
export function SummitMotif({
  className,
  tone = 'dark',
  animated = true,
  scrub = false,
}: {
  className?: string
  tone?: 'dark' | 'light'
  animated?: boolean
  /**
   * Hand the prong draw-in to scroll position instead of the entry animation.
   * Requires an ancestor `<ScrollScene>`, which publishes `--p`; the strokes
   * then draw as the band is read rather than all at once on arrival.
   */
  scrub?: boolean
}) {
  const brass = tone === 'dark' ? 'rgba(213,169,76,0.62)' : 'rgba(44,55,129,0.5)'
  const brassSoft = tone === 'dark' ? 'rgba(229,199,133,0.34)' : 'rgba(44,55,129,0.26)'
  const faint = tone === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(21,21,26,0.10)'
  const node = tone === 'dark' ? 'rgba(229,199,133,0.7)' : 'rgba(44,55,129,0.55)'

  return (
    <svg
      viewBox="0 0 480 320"
      aria-hidden="true"
      focusable="false"
      className={cn('h-auto w-full', className)}
      fill="none"
    >
      {/* Meridian arcs — global dialogue. The outer ring is graduated so the
          circle reads as an engraved graticule rather than a halo. */}
      {[70, 105, 140, 175].map((radius, index) => (
        <circle
          key={radius}
          cx="240"
          cy="320"
          r={radius}
          stroke={index === 3 ? brassSoft : faint}
          strokeWidth="1"
          strokeDasharray={index === 3 ? '2 7' : undefined}
        />
      ))}

      {/* Slowly drifting outer graticule. 52s per revolution: present, never
          demanding attention. */}
      <g
        className={animated ? 'animate-orbit' : undefined}
        style={{ transformOrigin: '240px 320px' }}
      >
        <circle cx="240" cy="320" r="205" stroke={faint} strokeWidth="1" strokeDasharray="1 11" />
        <circle cx="240" cy="320" r="205" stroke={brassSoft} strokeWidth="1" strokeDasharray="14 220" />
      </g>

      {/* Horizon rules with tick marks — the summit's horizontal planes. */}
      <g stroke={faint} strokeWidth="1">
        <path d="M40 236 H440" />
        <path d="M70 268 H410" />
        {[110, 160, 210, 260, 310, 360].map((x) => (
          <path key={x} d={`M${x} 268 V276`} />
        ))}
      </g>

      {/* Three converging prongs — summit geometry. Stroked with a normalised
          path length so the draw-in reads as drafting, not as a spinner. */}
      <g
        stroke={brass}
        strokeWidth="1.5"
        strokeLinecap="round"
        className={scrub ? 'scrub-draw' : animated ? 'animate-draw' : undefined}
      >
        <path pathLength={1} d="M240 320 L240 118" />
        <path pathLength={1} d="M240 320 L158 168" style={{ animationDelay: '120ms' }} />
        <path pathLength={1} d="M240 320 L322 168" style={{ animationDelay: '240ms' }} />
        <path pathLength={1} d="M240 118 L227 88" style={{ animationDelay: '360ms' }} />
        <path pathLength={1} d="M158 168 L143 146" style={{ animationDelay: '420ms' }} />
        <path pathLength={1} d="M322 168 L337 146" style={{ animationDelay: '480ms' }} />
      </g>

      {/* Underlying summit profiles, kept deliberately recessive. */}
      <g stroke={faint} strokeWidth="1">
        <path d="M96 320 L240 92 L384 320" />
        <path d="M140 320 L240 164 L340 320" />
      </g>

      {/* Nodes where the prongs meet their planes. */}
      <g fill={node}>
        <circle cx="240" cy="118" r="2.2" />
        <circle cx="158" cy="168" r="1.8" />
        <circle cx="322" cy="168" r="1.8" />
        <circle cx="240" cy="320" r="2.4" />
      </g>
    </svg>
  )
}

/** Trident rule — three converging prongs resolving into a hairline. */
export function TridentRule({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <span
      aria-hidden="true"
      data-surface={tone === 'dark' ? 'ink' : undefined}
      className={cn('rule-trident', className)}
    >
      <span />
    </span>
  )
}

/** Slim rule with an inset accent segment — used under editorial headings. */
export function AccentRule({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex h-px w-full items-center', tone === 'dark' ? 'bg-white/12' : 'bg-ink-200', className)}
    >
      <span className={cn('h-px w-14', tone === 'dark' ? 'bg-accent-400' : 'bg-brand-600')} />
    </span>
  )
}

/** Step connector used by the "How it works" journey. */
export function JourneyConnector({ vertical = false }: { vertical?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-gradient-to-r from-ink-300 to-transparent',
        vertical ? 'h-full w-px bg-gradient-to-b' : 'h-px w-full',
      )}
    />
  )
}

/** Concentric orbit mark for section anchors and lists. */
export function OrbitMark({
  className,
  index = 1,
  tone = 'light',
}: {
  className?: string
  index?: number
  tone?: 'light' | 'dark'
}) {
  return (
    <span className={cn('relative flex size-9 shrink-0 items-center justify-center', className)} aria-hidden="true">
      <span className={cn('absolute inset-0 rounded-full border', tone === 'dark' ? 'border-white/25' : 'border-ink-300')} />
      <span className={cn('absolute inset-1.5 rounded-full border', tone === 'dark' ? 'border-white/15' : 'border-ink-200')} />
      <span
        className={cn(
          'relative font-mono text-2xs tabular-nums',
          tone === 'dark' ? 'text-accent-300' : 'text-ink-600',
        )}
      >
        {String(index).padStart(2, '0')}
      </span>
    </span>
  )
}
