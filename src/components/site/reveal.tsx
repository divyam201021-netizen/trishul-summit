'use client'

import { useEffect, useRef } from 'react'
import { track, trackPageView } from '@/lib/analytics/track'
import type { AnalyticsEventName, AnalyticsProps } from '@/lib/analytics/events'

export type RevealVariant = 'rise' | 'mask' | 'left' | 'scale'

/**
 * Restrained scroll reveal: a single IntersectionObserver per element, no
 * animation library, and it degrades to "always visible" when the user prefers
 * reduced motion (handled in CSS, not here).
 *
 * Four variants share one vocabulary:
 *   rise  — default; a short lift for stacked content
 *   mask  — a clip-path wipe for editorial leads and framed plates
 *   left  — lateral entry for split layouts
 *   scale — a settle for cards inside a grid
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: As = 'div',
  variant = 'rise',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section' | 'article' | 'header' | 'figure'
  variant?: RevealVariant
}) {
  const ref = useRef<HTMLElement | null>(null)

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
      { rootMargin: '0px 0px -6% 0px', threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <As
      ref={ref as never}
      className={className}
      data-visible="false"
      data-reveal=""
      data-reveal-variant={variant === 'rise' ? undefined : variant}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </As>
  )
}

/**
 * Reading-progress rule. Writes one custom property on `documentElement`, so
 * the CSS does the painting and nothing re-renders per frame.
 */
export function ScrollProgress({ className }: { className?: string }) {
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - doc.clientHeight
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, doc.scrollTop / scrollable)) : 0
      doc.style.setProperty('--scroll-progress', ratio.toFixed(4))
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <span
      aria-hidden="true"
      className={className ?? 'scroll-progress bg-accent-400'}
      data-scroll-progress=""
    />
  )
}

/** Records an aggregate page view. No identifiers, no cookies. */
export function PageViewTracker({ surface }: { surface: 'public' | 'portal' | 'admin' }) {
  useEffect(() => {
    trackPageView(surface)
  }, [surface])
  return null
}

/** Wraps a call-to-action so clicks are counted without any personal data. */
export function TrackedLink({
  event,
  props,
  children,
  className,
}: {
  event: AnalyticsEventName
  props?: AnalyticsProps
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={className}
      onClickCapture={() => track(event, props)}
      onKeyDownCapture={(event_) => {
        if (event_.key === 'Enter' || event_.key === ' ') track(event, props)
      }}
    >
      {children}
    </span>
  )
}
