'use client'

import { useEffect, useState } from 'react'
import { deviceTimeZone, formatInTimeZone, zonedDateTimeToUtc } from '@/lib/time'

/**
 * Optional local-time convenience. It renders only after mount (so the server
 * markup stays deterministic) and only when a real date, time and time zone are
 * available. The published canonical time is never replaced by this hint.
 */
export function LocalTimeHint({
  date,
  startTime,
  endTime,
  timeZone,
}: {
  date: string | null
  startTime: string | null
  endTime: string | null
  timeZone: string | null
}) {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const device = deviceTimeZone()
    if (!device || !timeZone || !date) return

    const start = zonedDateTimeToUtc(date, startTime, timeZone)
    const end = zonedDateTimeToUtc(date, endTime, timeZone)
    if (!start && !end) return

    const format = (value: Date) => formatInTimeZone(value, device, { hour: '2-digit', minute: '2-digit', hour12: false })
    const startLabel = start ? format(start) : null
    const endLabel = end ? format(end) : null
    const range = startLabel && endLabel ? `${startLabel}–${endLabel}` : (startLabel ?? endLabel)

    if (!range) return
    setText(`${range} on your device (${device})`)
  }, [date, startTime, endTime, timeZone])

  if (!text) return null
  return (
    <p className="text-xs meta">
      Converted for you: <span className="tabular-nums">{text}</span>. Always follow the published canonical time above.
    </p>
  )
}
