import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The design system declares its own fluid type scale in `@theme`
 * (`text-2xs`, `text-display*`, `text-lead`). tailwind-merge only knows
 * Tailwind's stock scale, and treats any unrecognised `text-*` class as a text
 * *colour* — so `cn('text-display-sm', 'text-ink-900')` silently deleted the
 * size and every heading fell back to the browser default. Registering the
 * scale here fixes that for every call site at once.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs', 'display-sm', 'display', 'display-lg', 'display-xl', 'display-2xl', 'lead'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}

/** Cryptographically random, human-readable application reference. */
export function generateApplicationReference(): string {
  // Unambiguous alphabet (no 0/O/1/I/L) — safe to read over the phone or in email.
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `TRI-${out}`
}

export function formatDateTime(value: Date | string | null | undefined, timeZone?: string | null) {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone || 'UTC',
  }).format(date)
}

export function formatDate(value: Date | string | null | undefined, timeZone?: string | null) {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeZone: timeZone || 'UTC',
  }).format(date)
}

export function formatIsoDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

/** Format a minor-unit amount without inventing a currency when none is set. */
export function formatMoney(minor: number | null | undefined, currency: string | null | undefined) {
  if (minor == null || !currency) return null
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`
  }
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function truncate(text: string, max = 140) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Stable, dependency-free CSV serialiser for admin exports. */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? '' : String(cell)
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(','),
    )
    .join('\r\n')
}
