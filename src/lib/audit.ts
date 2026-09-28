import { prisma, stringifyJson } from '@/lib/db/client'
import { clientIpHash, userAgent } from '@/lib/security/request'

export type AuditActorType = 'admin' | 'participant' | 'system'

export interface AuditInput {
  actorType: AuditActorType
  actorId?: string | null
  actorLabel?: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary?: string | null
  before?: unknown
  after?: unknown
}

/**
 * Append-only audit trail. Fields are denormalised (actorLabel, before/after
 * snapshots) so the record stays meaningful even if an account is later
 * removed. Raw IP addresses are never stored — only a salted hash.
 *
 * Audit failures must never break the user's action, so errors are swallowed
 * after being logged.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const [ipHash, ua] = await Promise.all([clientIpHash(), userAgent()])
    await prisma.auditEvent.create({
      data: {
        actorType: input.actorType,
        adminActorId: input.actorType === 'admin' ? (input.actorId ?? null) : null,
        participantActorId: input.actorType === 'participant' ? (input.actorId ?? null) : null,
        actorLabel: input.actorLabel ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        beforeJson: input.before === undefined ? null : stringifyJson(input.before),
        afterJson: input.after === undefined ? null : stringifyJson(input.after),
        ipHash,
        userAgent: ua,
      },
    })
  } catch (error) {
    console.error('[audit] failed to record event', input.action, error)
  }
}

/** Diff helper for "before → after" snapshots without leaking unrelated fields. */
export function pickChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  keys: (keyof T)[],
): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {}
  const a: Partial<T> = {}
  for (const key of keys) {
    if (before[key] !== after[key] && after[key] !== undefined) {
      b[key] = before[key]
      a[key] = after[key]
    }
  }
  return { before: b, after: a }
}
