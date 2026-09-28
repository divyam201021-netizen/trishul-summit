/**
 * Time-zone helpers.
 *
 * The canonical event time is always displayed first and unmodified. Local-time
 * conversion is an additional, clearly-labelled convenience: it is derived from
 * the visitor's own device and never replaces the published time.
 */

export function isValidTimeZone(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function offsetMinutes(date: Date, timeZone: string): number {
  // Intl gives us the wall-clock time in the target zone; comparing it with the
  // UTC clock for the same instant yields the offset, DST included.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return (asUtc - date.getTime()) / 60000
}

/** Builds a UTC instant from a wall-clock date/time in a specific zone. */
export function zonedDateTimeToUtc(
  dateISO: string | null,
  time: string | null,
  timeZone: string | null,
): Date | null {
  if (!dateISO || !time || !isValidTimeZone(timeZone)) return null
  const [year, month, day] = dateISO.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null

  const naive = Date.UTC(year, month - 1, day, hour, minute)
  // Two passes converge even across a DST boundary.
  let guess = new Date(naive - offsetMinutes(new Date(naive), timeZone!) * 60000)
  guess = new Date(naive - offsetMinutes(guess, timeZone!) * 60000)
  return guess
}

export function formatInTimeZone(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).format(date)
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}
