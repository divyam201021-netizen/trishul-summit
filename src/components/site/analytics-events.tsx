'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics/track'
import type { AnalyticsEventName, AnalyticsProps } from '@/lib/analytics/events'

export { TrackedLink } from './reveal'

/** Fires once on mount — used for view events that need route context. */
export function PageViewEvent({ event, props }: { event: AnalyticsEventName; props?: AnalyticsProps }) {
  useEffect(() => {
    track(event, props)
    // Props are intentionally primitive (slug, label) — never personal data.
  }, [event, props])
  return null
}
