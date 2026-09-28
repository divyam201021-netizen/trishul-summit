'use client'

import { useEffect, useRef } from 'react'

/**
 * Pointer spotlight for dark bands.
 *
 * Writes two custom properties on the host element (its parent), which
 * `.spotlight::after` reads to paint a single warm highlight under the cursor.
 * One rAF per frame, no React state, no re-renders, and it never runs on touch
 * devices where there is no pointer to follow.
 */
export function SpotlightLayer() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = ref.current?.parentElement
    if (!host) return
    if (window.matchMedia('(hover: none)').matches) return

    let frame = 0
    const onMove = (event: PointerEvent) => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const rect = host.getBoundingClientRect()
        host.style.setProperty('--mx', `${Math.round(event.clientX - rect.left)}px`)
        host.style.setProperty('--my', `${Math.round(event.clientY - rect.top)}px`)
      })
    }

    host.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      host.removeEventListener('pointermove', onMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return <span ref={ref} hidden aria-hidden="true" />
}
