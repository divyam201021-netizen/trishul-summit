'use client'

import { createContext, useContext, useMemo } from 'react'
import { CONFIG_FIELD_BY_PATH, placeholderText, type ConfigValue } from '@/lib/config/registry'

/**
 * The resolved event configuration is serialised once in the root layout and
 * shared with every client component. That is what lets any component render an
 * authoritative value or a `[LABEL — TBD]` placeholder without a redesign.
 */
const ConfigContext = createContext<Record<string, ConfigValue>>({})

export function ConfigProvider({
  values,
  children,
}: {
  values: Record<string, ConfigValue>
  children: React.ReactNode
}) {
  return <ConfigContext.Provider value={values}>{children}</ConfigContext.Provider>
}

export function useConfigValues() {
  return useContext(ConfigContext)
}

export interface ResolvedText {
  /** Configured value, or null when still unknown. */
  value: string | null
  /** `[LABEL — TBD]` when unknown. */
  placeholder: string
  label: string
  missing: boolean
}

export function useConfigText(path: string): ResolvedText {
  const values = useConfigValues()
  return useMemo(() => {
    const raw = values[path]
    const label = CONFIG_FIELD_BY_PATH[path]?.label ?? path
    const value =
      raw === null || raw === undefined
        ? null
        : Array.isArray(raw)
          ? raw.join(', ') || null
          : String(raw).trim() || null
    return { value, placeholder: placeholderText(path), label, missing: !value }
  }, [values, path])
}
