'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { verifyPassword, verifyTotp } from '@/lib/auth/crypto'
import { endSession, startAdminSession, startParticipantSession } from '@/lib/auth/session'
import { recordAudit } from '@/lib/audit'
import { clientIp, clientIpHash, enforceRateLimit, userAgent } from '@/lib/security/request'
import { emailSchema, type ActionState } from '@/lib/security/validation'
import { safeRedirectPath } from '@/lib/security/redirect'

/**
 * Sign-in is deliberately uninformative about which part of the credentials was
 * wrong, and is rate-limited per IP and per account so credential stuffing is
 * expensive. Account lockout after repeated failures protects high-value admin
 * accounts in particular.
 */

export async function participantSignIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp()
  const limiter = enforceRateLimit(`signin:participant:${ip}`, 10, 10 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const parsed = emailSchema.safeParse(formData.get('email'))
  const password = formData.get('password')
  if (!parsed.success || typeof password !== 'string' || !password) {
    return { ok: false, message: 'Enter your email address and password.' }
  }

  const participant = await prisma.participant.findUnique({ where: { email: parsed.data } })
  const valid = participant ? await verifyPassword(password, participant.passwordHash) : false

  if (!participant || !valid || participant.disabledAt) {
    await recordAudit({
      actorType: 'system',
      action: 'auth.participant_failed',
      entityType: 'Participant',
      entityId: participant?.id ?? null,
      summary: 'Failed participant sign-in attempt',
    })
    return { ok: false, message: 'Those details did not match an account. Check your email address and password.' }
  }

  await prisma.participant.update({ where: { id: participant.id }, data: { lastLoginAt: new Date() } })
  await startParticipantSession(participant.id, await clientIpHash(), await userAgent())
  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    actorLabel: participant.fullName,
    action: 'auth.participant_signed_in',
    entityType: 'Participant',
    entityId: participant.id,
    summary: 'Participant signed in',
  })

  redirect(safeRedirectPath(formData.get('next'), '/portal'))
}

export async function participantSignOut() {
  await endSession('participant')
  redirect('/sign-in?status=signed-out')
}

export async function adminSignIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp()
  const limiter = enforceRateLimit(`signin:admin:${ip}`, 8, 10 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const parsed = emailSchema.safeParse(formData.get('email'))
  const password = formData.get('password')
  const mfaCode = formData.get('mfaCode')

  if (!parsed.success || typeof password !== 'string' || !password) {
    return { ok: false, message: 'Enter your organizer email address and password.' }
  }

  const admin = await prisma.adminUser.findUnique({ where: { email: parsed.data } })

  if (admin?.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    return { ok: false, message: 'This account is temporarily locked after repeated failed attempts. Try again later.' }
  }

  const valid = admin ? await verifyPassword(password, admin.passwordHash) : false

  if (!admin || !valid || admin.disabledAt) {
    if (admin) {
      const failed = admin.failedLogins + 1
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      })
    }
    await recordAudit({
      actorType: 'system',
      action: 'auth.admin_failed',
      entityType: 'AdminUser',
      entityId: admin?.id ?? null,
      summary: 'Failed organizer sign-in attempt',
    })
    return { ok: false, message: 'Those details did not match an organizer account.' }
  }

  // MFA-ready architecture: enforced as soon as an admin enrols.
  if (admin.mfaEnabled) {
    if (typeof mfaCode !== 'string' || !verifyTotp(admin.mfaSecret, mfaCode)) {
      return {
        ok: false,
        message: 'Enter the current 6-digit code from your authenticator app.',
        fieldErrors: { mfaCode: admin.mfaEnabled ? 'Code is invalid or has expired.' : '' },
        data: { mfaRequired: true },
      }
    }
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
  })
  await startAdminSession(admin.id, await clientIpHash(), await userAgent())
  await recordAudit({
    actorType: 'admin',
    actorId: admin.id,
    actorLabel: admin.name,
    action: 'auth.admin_signed_in',
    entityType: 'AdminUser',
    entityId: admin.id,
    summary: 'Organizer signed in',
  })

  redirect(safeRedirectPath(formData.get('next'), '/admin'))
}

export async function adminSignOut() {
  await endSession('admin')
  redirect('/admin/sign-in?status=signed-out')
}
