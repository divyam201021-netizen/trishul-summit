import { cache } from 'react'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { generateToken, hashWithSecret, sha256 } from './crypto'
import { parsePermissions } from './roles'
import type { Permission } from './permissions'

/**
 * Sessions are opaque random tokens; only a SHA-256 digest is stored server
 * side. Cookies are HttpOnly, SameSite=Lax and Secure in production so they are
 * never readable from JavaScript and never sent cross-site.
 *
 * Participant and admin sessions use separate cookies: signing into the
 * participant portal never grants organizer privileges.
 */
export const PARTICIPANT_COOKIE = 'ts_participant_session'
export const ADMIN_COOKIE = 'ts_admin_session'

const PARTICIPANT_TTL_MS = 1000 * 60 * 60 * 24 * 30
const ADMIN_TTL_MS = 1000 * 60 * 60 * 12

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export interface AuthenticatedParticipant {
  id: string
  email: string
  fullName: string
  sessionId: string
}

export interface AuthenticatedAdmin {
  id: string
  email: string
  name: string
  roleKey: string
  roleName: string
  permissions: Permission[]
  mfaEnabled: boolean
  sessionId: string
}

async function createSession(kind: 'participant' | 'admin', ownerId: string, ipHash: string | null, ua: string | null) {
  const token = generateToken(32)
  const ttl = kind === 'admin' ? ADMIN_TTL_MS : PARTICIPANT_TTL_MS
  const session = await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      kind,
      participantId: kind === 'participant' ? ownerId : null,
      adminId: kind === 'admin' ? ownerId : null,
      expiresAt: new Date(Date.now() + ttl),
      ipHash,
      userAgent: ua,
    },
  })
  return { token, session, maxAge: Math.floor(ttl / 1000) }
}

export async function startParticipantSession(participantId: string, ipHash: string | null, ua: string | null) {
  const { token, maxAge } = await createSession('participant', participantId, ipHash, ua)
  const store = await cookies()
  store.set(PARTICIPANT_COOKIE, token, { ...baseCookieOptions, maxAge })
  return token
}

export async function startAdminSession(adminId: string, ipHash: string | null, ua: string | null) {
  const { token, maxAge } = await createSession('admin', adminId, ipHash, ua)
  const store = await cookies()
  store.set(ADMIN_COOKIE, token, { ...baseCookieOptions, maxAge })
  return token
}

export async function endSession(kind: 'participant' | 'admin') {
  const store = await cookies()
  const name = kind === 'admin' ? ADMIN_COOKIE : PARTICIPANT_COOKIE
  const token = store.get(name)?.value
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  store.delete(name)
}

async function resolveSession(kind: 'participant' | 'admin') {
  const store = await cookies()
  const token = store.get(kind === 'admin' ? ADMIN_COOKIE : PARTICIPANT_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      participant: true,
      admin: { include: { role: true } },
    },
  })

  if (!session || session.kind !== kind || session.revokedAt) return null
  if (session.expiresAt.getTime() < Date.now()) return null
  if (kind === 'admin' && (!session.admin || session.admin.disabledAt)) return null
  if (kind === 'participant' && (!session.participant || session.participant.disabledAt)) return null

  // Sliding renewal: refresh lastSeenAt at most once an hour to limit writes.
  if (Date.now() - session.lastSeenAt.getTime() > 1000 * 60 * 60) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {})
  }

  return session
}

/** Request-scoped: the session is resolved once per render/action. */
export const getCurrentParticipant = cache(async (): Promise<AuthenticatedParticipant | null> => {
  const session = await resolveSession('participant')
  if (!session?.participant) return null
  const p = session.participant
  return { id: p.id, email: p.email, fullName: p.fullName, sessionId: session.id }
})

export const getCurrentAdmin = cache(async (): Promise<AuthenticatedAdmin | null> => {
  const session = await resolveSession('admin')
  if (!session?.admin) return null
  const admin = session.admin
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    roleKey: admin.role.key,
    roleName: admin.role.name,
    permissions: parsePermissions(admin.role.permissions),
    mfaEnabled: admin.mfaEnabled,
    sessionId: session.id,
  }
})

/** Revokes every session for a participant/admin (password change, lockout). */
export async function revokeAllSessions(kind: 'participant' | 'admin', ownerId: string) {
  await prisma.session.updateMany({
    where: {
      kind,
      revokedAt: null,
      ...(kind === 'admin' ? { adminId: ownerId } : { participantId: ownerId }),
    },
    data: { revokedAt: new Date() },
  })
}

export async function sessionFingerprint(ip: string) {
  return hashWithSecret(ip)
}
