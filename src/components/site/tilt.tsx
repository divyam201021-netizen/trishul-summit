'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { hasFinePointer, prefersReducedMotion } from './motion'

/**
 * A surface that answers the pointer in three dimensions.
 *
 * The frame owns the perspective, the plane inside it takes the rotation, and
 * any `<TiltLayer>` inside the plane is pushed toward the viewer on the z axis
 * so content really is stacked in depth rather than faked with a shadow.
 *
 * Two deliberate limits keep it premium instead of gimmicky:
 *
 *   - the rotation is capped (5° by default, and never more than the caller
 *     asks for), so text is never visually distorted or harder to read;
 *   - it is entirely opt-in per device. Touch, coarse pointers and
 *     `prefers-reduced-motion` get a completely static surface with no
 *     listeners attached at all.
 */
export function TiltSurface({
  children,
  className,
  planeClassName,
  /** Maximum rotation in degrees at the element edge. */
  max = 5,
  /** How far the plane rises toward the viewer while the pointer is inside. */
  lift = 10,
  glare = true,
  /** Set on a dark band so the cursor light is warm brass, not white. */
  mirroredTone = false,
}: {
  children: React.ReactNode
  className?: string
  /** Applied to the rotating plane — put `rounded-*` here so the glare clips. */
  planeClassName?: string
  max?: number
  lift?: number
  glare?: boolean
  /** Marks the subtree as sitting on a dark band so the glare lights correctly. */
  mirroredTone?: boolean
}) {
  const frame = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(hasFinePointer() && !prefersReducedMotion())
  }, [])

  useEffect(() => {
    const host = frame.current
    const plane = host?.firstElementChild as HTMLElement | undefined
    if (!host || !plane || !enabled) return

    const write = (nx: number, ny: number, depth: number) => {
      plane.style.setProperty('--ry', `${(nx * max).toFixed(2)}deg`)
      plane.style.setProperty('--rx', `${(-ny * max).toFixed(2)}deg`)
      plane.style.setProperty('--tx', `${(nx * 50 + 50).toFixed(1)}%`)
      plane.style.setProperty('--ty', `${(ny * 50 + 50).toFixed(1)}%`)
      plane.style.setProperty('--dz', `${depth.toFixed(1)}px`)
    }

    const at = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      return {
        nx: (event.clientX - rect.left) / rect.width - 0.5,
        ny: (event.clientY - rect.top) / rect.height - 0.5,
      }
    }

    const onMove = (event: PointerEvent) => {
      if (raf.current) return
      raf.current = window.requestAnimationFrame(() => {
        raf.current = 0
        const { nx, ny } = at(event)
        // A touch of extra lift near the edges makes the plane feel hinged
        // rather than merely rotated.
        write(nx * 2, ny * 2, lift + Math.min(1, Math.hypot(nx, ny) * 2) * 4)
        plane.dataset.tilting = ''
      })
    }

    const onLeave = () => {
      if (raf.current) {
        window.cancelAnimationFrame(raf.current)
        raf.current = 0
      }
      write(0, 0, 0)
      delete plane.dataset.tilting
    }

    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave, { passive: true })
    host.addEventListener('pointercancel', onLeave, { passive: true })
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('pointercancel', onLeave)
      if (raf.current) window.cancelAnimationFrame(raf.current)
    }
  }, [enabled, max, lift])

  return (
    <div
      ref={frame}
      className={cn('tilt-frame', className)}
      data-tilt={enabled ? '' : undefined}
      data-surface={mirroredTone ? 'ink' : undefined}
    >
      <div className={cn('tilt relative', planeClassName)}>
        {glare ? <span aria-hidden="true" className="tilt-glare" /> : null}
        {children}
      </div>
    </div>
  )
}

/**
 * Depth layer inside a `TiltSurface`. `z` is in px and is deliberately small —
 * 16–28px reads as genuine separation at these perspective values, and much
 * more than that starts to smear the text under it.
 */
export function TiltLayer({
  z = 22,
  className,
  children,
}: {
  z?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('tilt-layer', className)} style={{ '--z': `${z}px` } as React.CSSProperties}>
      {children}
    </div>
  )
}
