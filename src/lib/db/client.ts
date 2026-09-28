import { PrismaClient } from '@prisma/client'

/**
 * A single Prisma client per process. In development the instance is cached on
 * `globalThis` so hot reloads do not exhaust database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Safe JSON column accessors — SQLite stores structured payloads as strings. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null)
  } catch {
    return 'null'
  }
}
