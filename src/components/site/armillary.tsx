import { cn } from '@/lib/utils'

/**
 * A wireframe meridian sphere, built from nothing but CSS 3D transforms.
 *
 * Six meridians at 30° intervals, an equator, two tropics and one tilted
 * ecliptic carrying a single brass node that actually orbits the sphere as the
 * stage rotates. It is drawn as a drafting instrument — engraved rings, hair
 * lines, one metal marker — not as a glossy 3D blob or a stock globe.
 *
 * Purely decorative: hidden from assistive technology, no interaction, and the
 * rotation stops entirely under `prefers-reduced-motion` (see globals.css).
 */
const MERIDIANS = [0, 30, 60, 90, 120, 150]

export function ArmillaryGlobe({
  className,
  size = '20rem',
  paused = false,
}: {
  className?: string
  /** Any CSS length. The sphere is square, so this sets both axes. */
  size?: string
  paused?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('armillary', className)}
      style={{ '--size': size } as React.CSSProperties}
    >
      <span className="armillary-halo" />
      <span className="armillary-axis" />

      <div className={cn('armillary-nod', paused && '[&_*]:[animation-play-state:paused]')}>
        <div className="armillary-stage">
          {/* Meridians: a viewer-facing circle rotated about the polar axis. */}
          {MERIDIANS.map((degrees, index) => (
            <span
              key={degrees}
              className={cn('armillary-ring', index % 2 === 1 && 'armillary-ring-soft')}
              style={{ transform: `rotateY(${degrees}deg)` }}
            />
          ))}

          {/* Parallels: the same circle turned a quarter turn about X. */}
          <span className="armillary-ring armillary-ring-accent" style={{ transform: 'rotateX(90deg)' }} />
          <span className="armillary-ring armillary-ring-soft" style={{ transform: 'rotateX(90deg) scale(0.74)' }} />
          <span className="armillary-ring armillary-ring-soft" style={{ transform: 'rotateX(90deg) scale(0.46)' }} />

          {/* Ecliptic: the one off-axis ring, with the marker that travels it. */}
          <span
            className="armillary-ring armillary-ring-accent"
            style={{ transform: 'rotateX(72deg) rotateZ(-14deg)' }}
          >
            <span className="armillary-node" />
          </span>
        </div>
      </div>

      <span className="armillary-base" />
    </div>
  )
}
