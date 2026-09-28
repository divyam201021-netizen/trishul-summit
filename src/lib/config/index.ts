import { cache } from 'react'
import { prisma, parseJson, stringifyJson } from '@/lib/db/client'
import {
  CONFIG_FIELDS,
  CONFIG_FIELD_BY_PATH,
  LOGO_PLACEHOLDER,
  placeholderText,
  type ConfigField,
  type ConfigValue,
} from './registry'

export * from './registry'

export type ConfigValues = Record<string, ConfigValue>

export interface EventConfig {
  readonly values: ConfigValues
  /** Raw value, or null when the organizer has not supplied one. */
  value(path: string): ConfigValue
  /** String value, trimmed; null when empty. */
  text(path: string): string | null
  list(path: string): string[]
  bool(path: string): boolean
  num(path: string): number | null
  /** `[LABEL — TBD]` for the given field. */
  tbd(path: string): string
  /** The configured value, or the placeholder string when unset. */
  display(path: string): string
  isSet(path: string): boolean
  label(path: string): string
}

function defaults(): ConfigValues {
  const values: ConfigValues = {}
  for (const field of CONFIG_FIELDS) values[field.path] = field.default ?? null
  return values
}

function normalise(path: string, raw: unknown): ConfigValue {
  const field = CONFIG_FIELD_BY_PATH[path]
  const type = field?.type ?? 'text'
  if (raw === null || raw === undefined || raw === '') return type === 'boolean' ? false : null
  if (type === 'boolean') return raw === true || raw === 'true'
  if (type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(n) ? n : null
  }
  if (type === 'list') {
    if (Array.isArray(raw)) {
      return raw.map((item) => String(item).trim()).filter(Boolean)
    }
    if (typeof raw === 'string') {
      return raw
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
    return null
  }
  return typeof raw === 'string' ? raw.trim() || null : String(raw)
}

function isUnset(value: ConfigValue): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function createConfig(values: ConfigValues): EventConfig {
  const get = (path: string): ConfigValue => {
    if (!CONFIG_FIELD_BY_PATH[path]) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[config] Unknown config path "${path}" — add it to src/lib/config/registry.ts`)
      }
      return null
    }
    return values[path] ?? null
  }

  return {
    values,
    value: get,
    text(path) {
      const raw = get(path)
      if (raw === null || raw === undefined) return null
      const str = Array.isArray(raw) ? raw.join(', ') : String(raw)
      return str.trim() ? str.trim() : null
    },
    list(path) {
      const raw = get(path)
      if (Array.isArray(raw)) return raw.filter((item) => String(item).trim().length > 0)
      if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
      return []
    },
    bool(path) {
      return get(path) === true || get(path) === 'true'
    },
    num(path) {
      const raw = get(path)
      if (raw === null || typeof raw === 'boolean' || Array.isArray(raw)) return null
      const n = typeof raw === 'number' ? raw : Number(raw)
      return Number.isFinite(n) ? n : null
    },
    tbd(path) {
      return placeholderText(path)
    },
    display(path) {
      return this.text(path) ?? placeholderText(path)
    },
    isSet(path) {
      return !isUnset(get(path))
    },
    label: (path) => CONFIG_FIELD_BY_PATH[path]?.label ?? path,
  }
}

export function defaultConfig(): EventConfig {
  return createConfig(defaults())
}

/** Reads overrides from the database and merges them over the registry defaults. */
export async function loadConfig(): Promise<EventConfig> {
  const values = defaults()
  // A missing table (before `npm run db:push`) must not break rendering: pages
  // simply fall back to the placeholder defaults.
  try {
    const rows = await prisma.siteSetting.findMany()
    for (const row of rows) {
      if (!CONFIG_FIELD_BY_PATH[row.key]) continue
      values[row.key] = normalise(row.key, parseJson<unknown>(row.value, null))
    }
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[config] site_settings unavailable — using registry defaults (run `npm run db:push`)')
    }
  }
  return createConfig(values)
}

/** Request-scoped memoisation so a page renders with one consistent snapshot. */
export const getEventConfig = cache(loadConfig)

export interface ConfigSaveResult {
  saved: string[]
  errors: string[]
}

/** Validates and persists admin edits. Unknown paths are rejected outright. */
export async function saveConfig(
  updates: Record<string, unknown>,
  actorId: string | null,
): Promise<ConfigSaveResult> {
  const saved: string[] = []
  const errors: string[] = []

  for (const [path, rawValue] of Object.entries(updates)) {
    const field: ConfigField | undefined = CONFIG_FIELD_BY_PATH[path]
    if (!field) {
      errors.push(`Unknown setting: ${path}`)
      continue
    }
    if (field.type === 'color' && typeof rawValue === 'string' && rawValue.trim()) {
      if (!/^#[0-9a-fA-F]{6}$/.test(rawValue.trim())) {
        errors.push(`${field.label}: use a 6-digit hex value such as #3746A6`)
        continue
      }
    }
    if (field.type === 'email' && typeof rawValue === 'string' && rawValue.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue.trim())) {
        errors.push(`${field.label}: enter a valid email address`)
        continue
      }
    }
    if (field.type === 'url' && typeof rawValue === 'string' && rawValue.trim()) {
      try {
        new URL(rawValue.trim())
      } catch {
        errors.push(`${field.label}: enter a complete URL including https://`)
        continue
      }
    }

    const value = normalise(path, rawValue)
    await prisma.siteSetting.upsert({
      where: { key: path },
      create: { key: path, value: stringifyJson(value), updatedById: actorId },
      update: { value: stringifyJson(value), updatedById: actorId },
    })
    saved.push(path)
  }

  return { saved, errors }
}

/** Login page and other pre-database screens need a name that is always safe. */
export function eventName(config: EventConfig) {
  return config.text('identity.name') ?? 'Trishul Summit'
}

export function logoOrWordmark(config: EventConfig) {
  return {
    logoUrl: config.text('identity.logoUrl'),
    wordmark: config.text('identity.wordmark') ?? 'TRISHUL SUMMIT',
    logoPlaceholder: LOGO_PLACEHOLDER,
  }
}

/**
 * Serialisable logo props.
 *
 * The resolved config object carries methods, so it can never be handed to a
 * client component. Anything a client-side tree needs must be reduced to plain
 * values here first.
 */
export function brandProps(config: EventConfig) {
  return {
    wordmark: config.text('identity.wordmark') ?? 'TRISHUL SUMMIT',
    logoUrl: config.text('identity.logoUrl'),
  }
}

/**
 * Turn a single configured hex brand colour into a full runtime token ramp, so
 * the organizer can rebrand the platform from /admin/content without a build.
 */
export function brandColorStyle(hex: string | null): string | null {
  if (!hex) return null
  const base = hex.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(base)) return null
  const mix = (weight: number, towards: 'white' | 'black') =>
    `color-mix(in oklab, ${base} ${weight}%, ${towards === 'white' ? '#ffffff' : '#000000'})`
  return `:root{${[
    ['--brand-50', mix(8, 'white')],
    ['--brand-100', mix(16, 'white')],
    ['--brand-200', mix(32, 'white')],
    ['--brand-300', mix(52, 'white')],
    ['--brand-400', mix(76, 'white')],
    ['--brand-500', mix(92, 'white')],
    ['--brand-600', base],
    ['--brand-700', mix(84, 'black')],
    ['--brand-800', mix(70, 'black')],
    ['--brand-900', mix(56, 'black')],
    ['--brand-950', mix(38, 'black')],
  ]
    .map(([token, value]) => `${token}:${value}`)
    .join(';')}}`
}
