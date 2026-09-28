'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Motion primitives                                                           */
/* -------------------------------------------------------------------------- */
/**
 * Depth, parallax and pointer response, without a motion library.
 *
 * Three rules hold this together:
 *
 *   1. One shared rAF loop. Every element subscribes to a single scroll and
 *      resize listener and does its work once per frame — never one listener
 *      per element.
 *   2. Layout is read once per resize, not once per frame. Each subscriber
 *      caches its document offset and computes from `scrollY`, so a frame
 *      never forces a synchronous reflow.
 *   3. Only `transform` and custom properties are written. Nothing here
 *      triggers React state, so a scroll never re-renders a component.
 *
 * Everything is inert under `prefers-reduced-motion: reduce`, and pointer
 * effects additionally require a real pointer (`hover: hover`), so touch
 * devices get the finished layout with no work attached.
 */

const tasks = new Set<() => void>()
let frame = 0

function flush() {
  frame = 0
  for (const task of tasks) task()
}

function requestTick() {
  if (!frame) frame = window.requestAnimationFrame(flush)
}

function subscribe(task: () => void) {
  tasks.add(task)
  if (tasks.size === 1) {
    window.addEventListener('scroll', requestTick, { passive: true })
    window.addEventListener('resize', requestTick, { passive: true })
  }
  // Paint the correct state immediately rather than on the first scroll.
  task()
  return () => {
    tasks.delete(task)
    if (tasks.size === 0) {
      window.removeEventListener('scroll', requestTick)
      window.removeEventListener('resize', requestTick)
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
    }
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

interface ViewMetrics {
  /** Document-space top edge of the element. */
  top: number
  height: number
  scrollY: number
  viewport: number
}

/**
 * Binds an element to the shared scroll loop, handing it cached geometry.
 * Offsets are re-measured on resize and whenever the element itself resizes,
 * which covers font swaps, image loads and late content.
 */
function useScrollLink<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  compute: (metrics: ViewMetrics) => void,
  enabled = true,
) {
  const computeRef = useRef(compute)
  computeRef.current = compute

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled || prefersReducedMotion()) return

    let top = 0
    let height = 0

    const measure = () => {
      const rect = node.getBoundingClientRect()
      top = rect.top + window.scrollY
      height = rect.height
    }

    const run = () => computeRef.current({ top, height, scrollY: window.scrollY, viewport: window.innerHeight })

    measure()
    const unsubscribe = subscribe(run)

    const remeasure = () => {
      measure()
      run()
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure)
    observer?.observe(node)
    window.addEventListener('resize', remeasure)

    return () => {
      unsubscribe()
      observer?.disconnect()
      window.removeEventListener('resize', remeasure)
    }
  }, [ref, enabled])
}

/**
 * Reveal-on-entry, shared by kinetic type and any custom surface that needs to
 * know when it has been seen. Writes `data-visible` rather than state, so the
 * CSS owns the animation.
 */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -8% 0px') {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      node.dataset.visible = 'true'
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).dataset.visible = 'true'
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin, threshold: 0.12 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  return ref
}

/* -------------------------------------------------------------------------- */
/* Parallax                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Depth layer. `depth` is the total travel in px across a full viewport of
 * scroll — positive moves with the page (slower than the content behind it),
 * negative against it. Keep it small: this is weight, not spectacle.
 */
export function Parallax({
  depth = 40,
  className,
  children,
}: {
  depth?: number
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollLink(ref, ({ top, height, scrollY, viewport }) => {
    const node = ref.current
    if (!node) return
    // Signed distance of the element centre from the viewport centre, in
    // viewport units: −1 as it leaves the top, +1 as it enters the bottom.
    const offset = clamp((top + height / 2 - scrollY - viewport / 2) / viewport, -1.6, 1.6)
    node.style.setProperty('--parallax', `${(offset * -depth).toFixed(2)}px`)
  })

  return (
    <div ref={ref} className={cn('parallax', className)}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Scroll scene                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Publishes traversal progress as `--p` (0 → 1) on the element itself, so any
 * descendant — including plain SVG and plain CSS — can be scrubbed by scroll
 * position without its own JavaScript. The motif uses this to draw its prongs
 * progressively as the band comes into view.
 */
export function ScrollScene({
  className,
  children,
  from = 0,
  to = 1,
}: {
  className?: string
  children: React.ReactNode
  /** Clamp window: progress is remapped from [from, to] onto [0, 1]. */
  from?: number
  to?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollLink(ref, ({ top, height, scrollY, viewport }) => {
    const node = ref.current
    if (!node) return
    const raw = (scrollY + viewport - top) / (viewport + height)
    const progress = to === from ? 0 : clamp((raw - from) / (to - from), 0, 1)
    node.style.setProperty('--p', progress.toFixed(4))
  })

  return (
    <div ref={ref} className={cn('scene', className)}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Magnetic response                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A control that leans very slightly toward the pointer and springs back on
 * exit. Two custom properties, one rAF, no state — and it only runs where a
 * real pointer exists.
 */
export function Magnetic({
  strength = 6,
  tilt = 0,
  className,
  children,
}: {
  /** Maximum translate in px at the element edge. */
  strength?: number
  /** Optional lean, in degrees, at the element edge. */
  tilt?: number
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(hasFinePointer() && !prefersReducedMotion())
  }, [])

  useEffect(() => {
    const host = ref.current
    if (!host || !enabled) return
    let raf = 0

    // Written on the wrapper itself: custom properties inherit downwards, so a
    // child could never move its own parent.
    const write = (dx: number, dy: number) => {
      host.style.setProperty('--magnet-x', `${dx.toFixed(2)}px`)
      host.style.setProperty('--magnet-y', `${dy.toFixed(2)}px`)
      host.style.setProperty('--magnet-tilt', `${(dx / strength) * tilt}deg`)
    }

    const onMove = (event: PointerEvent) => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const rect = host.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        write(x * 2 * strength, y * 2 * strength * 0.6)
      })
    }

    const onLeave = () => {
      if (raf) {
        window.cancelAnimationFrame(raf)
        raf = 0
      }
      write(0, 0)
    }

    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [enabled, strength, tilt])

  return (
    <span
      ref={ref}
      className={cn('inline-flex', className)}
      style={{
        transform: 'translate3d(var(--magnet-x, 0px), var(--magnet-y, 0px), 0) rotate(var(--magnet-tilt, 0deg))',
        transition: 'transform 420ms var(--ease-out-expo)',
      }}
      data-magnetic={enabled ? '' : undefined}
    >
      {children}
    </span>
  )
}
