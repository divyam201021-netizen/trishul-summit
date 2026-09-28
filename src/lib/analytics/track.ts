'use client'

import { isAnalyticsEvent, type AnalyticsEventName, type AnalyticsProps } from './events'

const SESSION_KEY = 'ts_analytics_session'

/**
 * Cookie-less, first-party, best-effort analytics beacon.
 *
 * - The session id is a random value in sessionStorage; it disappears when the
 *   tab closes and is never joined to an account.
 * - Failures are silent: analytics must never block or break an interaction.
 * - Respects Do Not Track and Global Privacy Control.
 */
function sessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    window.sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return null
  }
}

function optedOut(): boolean {
  if (typeof navigator === 'undefined') return true
  const dnt = (navigator as Navigator & { doNotTrack?: string }).doNotTrack
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  return dnt === '1' || gpc === true
}

export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return
  if (!isAnalyticsEvent(name)) return
  if (optedOut()) return

  const payload = JSON.stringify({
    name,
    props: props ?? {},
    path: window.location.pathname,
    sessionId: sessionId(),
    referrer: document.referrer ? new URL(document.referrer).host : null,
  })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }))
      return
    }
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* analytics is strictly best-effort */
  }
}

export function trackPageView(surface: 'public' | 'portal' | 'admin') {
  track('page_view', { path: window.location.pathname, surface })
}
