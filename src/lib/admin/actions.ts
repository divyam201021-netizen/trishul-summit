'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma, stringifyJson } from '@/lib/db/client'
import { assertAdmin, AuthorizationError } from '@/lib/auth/guards'
import { PERMISSIONS, type Permission } from '@/lib/auth/permissions'
import { recordAudit } from '@/lib/audit'
import { clientIp, enforceRateLimit } from '@/lib/security/request'
import { sanitizePlainText, zodFieldErrors, type ActionState } from '@/lib/security/validation'
import { canTransition, statusMeta, APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/registration/status'
import { getEventConfig, saveConfig } from '@/lib/config'
import { sendEmail } from '@/lib/mail/transport'
import { renderTemplate, TEMPLATE_BY_KEY } from '@/lib/mail/templates'
import { hashPassword, generateTotpSecret, verifyTotp, passwordIssues } from '@/lib/auth/crypto'
import { revokeAllSessions } from '@/lib/auth/session'
import { ROLE_PRESETS } from '@/lib/auth/permissions'
import { slugify } from '@/lib/utils'

/**
 * ============================================================================
 * ORGANIZER SERVER ACTIONS
 * ============================================================================
 * Every action:
 *   1. re-checks the session and the exact permission (never trusts the client)
 *   2. validates and sanitises input
 *   3. writes the change and an append-only audit record
 *   4. returns a safe, actionable message — never a raw database error
 */

type AuditActor = { id: string; name: string }

async function gate(permission: Permission): Promise<AuditActor> {
  const admin = await assertAdmin(permission)
  return { id: admin.id, name: admin.name }
}

function failure(error: unknown): ActionState {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message }
  console.error('[admin-action]', error)
  return {
    ok: false,
    message: 'That change could not be saved. Nothing was lost — try again, and contact the platform lead if it persists.',
  }
}

// ---------------------------------------------------------------------------
// Applications: status, notes, allocation
// ---------------------------------------------------------------------------

export async function updateApplicationStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.applicationsStatus)
    const applicationId = String(formData.get('applicationId') ?? '')
    const next = String(formData.get('status') ?? '').toUpperCase() as ApplicationStatus
    const publicNote = sanitizePlainText(formData.get('publicNote') ?? '', 400) || null
    const notify = formData.get('notify') === 'on'

    if (!APPLICATION_STATUSES.includes(next)) return { ok: false, message: 'Choose a valid status.' }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { participant: true },
    })
    if (!application) return { ok: false, message: 'That application no longer exists.' }

    if (!canTransition(application.status, next)) {
      return {
        ok: false,
        message: `An application that is "${statusMeta(application.status).label}" cannot move straight to "${statusMeta(next).label}".`,
      }
    }

    await prisma.application.update({
      where: { id: application.id },
      data: {
        status: next,
        decidedAt: ['CONFIRMED', 'DECLINED', 'WAITLISTED'].includes(next) ? new Date() : application.decidedAt,
        withdrawnAt: next === 'WITHDRAWN' ? new Date() : application.withdrawnAt,
      },
    })
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: next,
        publicNote,
        actorId: actor.id,
      },
    })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'application.status_changed',
      entityType: 'Application',
      entityId: application.id,
      summary: `${application.reference}: ${application.status} → ${next}`,
      before: { status: application.status },
      after: { status: next, publicNote },
    })

    let message = `Status updated to ${statusMeta(next).label}.`
    if (notify) {
      const templateKey = TEMPLATE_FOR_STATUS[next]
      const template = templateKey ? TEMPLATE_BY_KEY[templateKey] : null
      if (template) {
        const vars = await templateVarsFor(application.id)
        const { text: subject, unresolved: subjectTokens } = renderTemplate(template.subject, vars)
        const { text: body, unresolved: bodyTokens } = renderTemplate(template.body, vars)
        const result = await sendEmail({
          to: application.participant.email,
          subject,
          body,
          templateKey: template.key,
          kind: template.kind,
        })
        message += ` Email ${result.status === 'sent' ? 'sent' : 'queued for delivery'}.`
        const unresolved = [...new Set([...subjectTokens, ...bodyTokens])]
        if (unresolved.length) {
          message += ` ${unresolved.length} placeholder token(s) remain in the message (${unresolved.join(', ')}).`
        }
      } else {
        message += ' No template is mapped to this status, so no email was sent.'
      }
    }

    revalidatePath('/admin/applications')
    revalidatePath(`/admin/applications/${application.id}`)
    revalidatePath('/portal')
    return { ok: true, message }
  } catch (error) {
    return failure(error)
  }
}

const TEMPLATE_FOR_STATUS: Partial<Record<ApplicationStatus, string>> = {
  SUBMITTED: 'application_submitted',
  UNDER_REVIEW: 'application_under_review',
  ACTION_REQUIRED: 'action_required',
  ACCEPTED_PAYMENT_PENDING: 'accepted',
  CONFIRMED: 'confirmed',
  WAITLISTED: 'waitlisted',
}

async function templateVarsFor(applicationId: string) {
  const config = await getEventConfig()
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { participant: true, assignedCommittee: true },
  })
  return {
    'PARTICIPANT NAME': application?.participant.fullName ?? null,
    'APPLICATION REFERENCE': application?.reference ?? null,
    'COMMITTEE NAME': application?.assignedCommittee?.name ?? null,
    'EVENT DATE': config.text('event.dateSummary'),
    'TIME ZONE': config.text('event.timeZone'),
    'JOINING LINK': config.text('platform.joinUrl'),
    'SUPPORT EMAIL': config.text('contact.supportEmail'),
    'PAYMENT DETAILS': config.text('fees.paymentMethod'),
    'NEXT STEP': config.text('event.nextStepAfterSubmission'),
    'REGISTRATION DEADLINE': config.text('registration.deadline'),
  }
}

export async function addReviewerNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.applicationsNotes)
    const applicationId = String(formData.get('applicationId') ?? '')
    const body = sanitizePlainText(formData.get('body') ?? '', 2000)
    if (body.length < 3) return { ok: false, message: 'Write a note before saving.' }

    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application) return { ok: false, message: 'That application no longer exists.' }

    await prisma.applicationNote.create({ data: { applicationId, authorId: actor.id, body } })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'application.note_added',
      entityType: 'Application',
      entityId: applicationId,
      summary: `Internal note added to ${application.reference}`,
    })
    revalidatePath(`/admin/applications/${applicationId}`)
    return { ok: true, message: 'Internal note saved. Participants never see reviewer notes.' }
  } catch (error) {
    return failure(error)
  }
}

export async function allocateCommittee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.applicationsAssign)
    const applicationId = String(formData.get('applicationId') ?? '')
    const committeeId = String(formData.get('committeeId') ?? '')
    const role = sanitizePlainText(formData.get('role') ?? '', 80) || null
    const reason = sanitizePlainText(formData.get('reason') ?? '', 400) || null
    const overrideCapacity = formData.get('overrideCapacity') === 'on'

    const [application, committee] = await Promise.all([
      prisma.application.findUnique({ where: { id: applicationId }, include: { assignedCommittee: true } }),
      prisma.committee.findUnique({
        where: { id: committeeId },
        include: { _count: { select: { assignedApplications: true } } },
      }),
    ])
    if (!application) return { ok: false, message: 'That application no longer exists.' }
    if (!committee) return { ok: false, message: 'Choose a committee to allocate.' }

    const warnings: string[] = []
    if (committee.status !== 'open') warnings.push(`${committee.name ?? 'This committee'} is currently marked "${committee.status}".`)
    if (committee.isPlaceholder) warnings.push('This committee is still a placeholder awaiting official detail.')
    if (committee.capacity != null && committee._count.assignedApplications >= committee.capacity) {
      warnings.push(
        `Capacity is full (${committee._count.assignedApplications}/${committee.capacity}). The participant should be waitlisted unless you intentionally over-allocate.`,
      )
    }
    if (application.assignedCommitteeId === committee.id) {
      return { ok: false, message: 'That participant is already allocated to this committee.' }
    }

    const blocking = committee.capacity != null && committee._count.assignedApplications >= committee.capacity
    if (blocking && !overrideCapacity) {
      return { ok: false, message: `Not saved — ${warnings.join(' ')} Tick the override box to allocate anyway.` }
    }

    await prisma.$transaction([
      prisma.assignment.updateMany({
        where: { applicationId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.assignment.create({
        data: {
          applicationId,
          committeeId: committee.id,
          role,
          previousCommitteeId: application.assignedCommitteeId,
          assignedById: actor.id,
          reason,
        },
      }),
      prisma.application.update({ where: { id: applicationId }, data: { assignedCommitteeId: committee.id } }),
    ])

    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'application.committee_allocated',
      entityType: 'Application',
      entityId: applicationId,
      summary: `${application.reference} allocated to ${committee.name ?? committee.slug}`,
      before: { committee: application.assignedCommittee?.name ?? application.assignedCommitteeId },
      after: { committee: committee.name ?? committee.id, role, reason },
    })

    revalidatePath('/admin/applications')
    revalidatePath(`/admin/applications/${applicationId}`)
    revalidatePath('/portal')
    return {
      ok: true,
      message: `Allocated to ${committee.name ?? 'the selected committee'}. Allocation history recorded.${warnings.length ? ` Note: ${warnings.join(' ')}` : ''}`,
    }
  } catch (error) {
    return failure(error)
  }
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordManualPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.paymentsManage)
    const applicationId = String(formData.get('applicationId') ?? '')
    const amount = Number(formData.get('amountMajor') ?? 0)
    const currency = (sanitizePlainText(formData.get('currency') ?? '', 8) || '').toUpperCase()
    const note = sanitizePlainText(formData.get('note') ?? '', 400) || null
    const status = String(formData.get('status') ?? 'manually_verified')

    if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: 'Enter a valid amount.' }
    if (!currency) return { ok: false, message: 'Enter the currency the payment was made in.' }

    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application) return { ok: false, message: 'That application no longer exists.' }

    const payment = await prisma.payment.create({
      data: {
        applicationId,
        status,
        amountMinor: Math.round(amount * 100),
        currency,
        provider: 'manual',
        idempotencyKey: `manual-${applicationId}-${Date.now()}`,
        verifiedAt: status === 'manually_verified' || status === 'succeeded' ? new Date() : null,
      },
    })
    await prisma.paymentAction.create({
      data: { paymentId: payment.id, action: status, note, actorId: actor.id },
    })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'payment.manually_recorded',
      entityType: 'Payment',
      entityId: payment.id,
      summary: `${application.reference}: recorded ${currency} ${amount.toFixed(2)} as ${status}`,
      after: { status, amountMinor: payment.amountMinor, currency },
    })

    revalidatePath('/admin/payments')
    revalidatePath(`/admin/applications/${applicationId}`)
    revalidatePath('/portal')
    return { ok: true, message: 'Payment recorded and the participant portal updated.' }
  } catch (error) {
    return failure(error)
  }
}

// ---------------------------------------------------------------------------
// Programme: committees & schedule
// ---------------------------------------------------------------------------

export async function upsertCommittee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.committeesManage)
    const id = String(formData.get('id') ?? '')
    const name = sanitizePlainText(formData.get('name') ?? '', 160)
    const slugInput = sanitizePlainText(formData.get('slug') ?? '', 80)
    const capacityRaw = String(formData.get('capacity') ?? '').trim()

    const data = {
      name: name || null,
      type: sanitizePlainText(formData.get('type') ?? '', 80) || null,
      topic: sanitizePlainText(formData.get('topic') ?? '', 240) || null,
      description: sanitizePlainText(formData.get('description') ?? '', 3000) || null,
      language: sanitizePlainText(formData.get('language') ?? '', 60) || null,
      experienceLevel: sanitizePlainText(formData.get('experienceLevel') ?? '', 40) || null,
      expectedProfile: sanitizePlainText(formData.get('expectedProfile') ?? '', 1200) || null,
      preparationInfo: sanitizePlainText(formData.get('preparationInfo') ?? '', 2000) || null,
      chairName: sanitizePlainText(formData.get('chairName') ?? '', 120) || null,
      chairTitle: sanitizePlainText(formData.get('chairTitle') ?? '', 120) || null,
      capacity: capacityRaw ? Number(capacityRaw) : null,
      status: String(formData.get('status') ?? 'open'),
      displayOrder: Number(formData.get('displayOrder') ?? 0) || 0,
      isPlaceholder: false,
    }

    if (data.capacity != null && (!Number.isFinite(data.capacity) || data.capacity < 0)) {
      return { ok: false, message: 'Capacity must be a positive number or left empty.' }
    }

    const slug = slugify(slugInput || name || `committee-${Date.now()}`)

    if (id) {
      const before = await prisma.committee.findUnique({ where: { id } })
      if (!before) return { ok: false, message: 'That committee no longer exists.' }
      await prisma.committee.update({ where: { id }, data: { ...data, slug } })
      await recordAudit({
        actorType: 'admin',
        actorId: actor.id,
        actorLabel: actor.name,
        action: 'committee.updated',
        entityType: 'Committee',
        entityId: id,
        summary: `Updated committee ${data.name ?? slug}`,
        before: { name: before.name, capacity: before.capacity, status: before.status },
        after: { name: data.name, capacity: data.capacity, status: data.status },
      })
    } else {
      const created = await prisma.committee.create({ data: { ...data, slug } })
      await recordAudit({
        actorType: 'admin',
        actorId: actor.id,
        actorLabel: actor.name,
        action: 'committee.created',
        entityType: 'Committee',
        entityId: created.id,
        summary: `Created committee ${created.name ?? created.slug}`,
        after: { name: created.name, slug: created.slug },
      })
    }

    revalidatePath('/admin/committees')
    revalidatePath('/committees')
    return { ok: true, message: 'Committee saved. Public pages are up to date.' }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteCommittee(formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.committeesManage)
    const id = String(formData.get('id') ?? '')
    const committee = await prisma.committee.findUnique({
      where: { id },
      include: { _count: { select: { assignedApplications: true, preferences: true } } },
    })
    if (!committee) return { ok: false, message: 'That committee no longer exists.' }
    if (committee._count.assignedApplications > 0) {
      return {
        ok: false,
        message: `${committee._count.assignedApplications} participant(s) are allocated to this committee. Close it instead of deleting it.`,
      }
    }
    await prisma.committee.delete({ where: { id } })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'committee.deleted',
      entityType: 'Committee',
      entityId: id,
      summary: `Deleted committee ${committee.name ?? committee.slug}`,
      before: { name: committee.name, slug: committee.slug },
    })
    revalidatePath('/admin/committees')
    revalidatePath('/committees')
    return { ok: true, message: 'Committee deleted.' }
  } catch (error) {
    return failure(error)
  }
}

export async function upsertScheduleSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.scheduleManage)
    const id = String(formData.get('id') ?? '')
    const startTime = sanitizePlainText(formData.get('startTime') ?? '', 8)
    const endTime = sanitizePlainText(formData.get('endTime') ?? '', 8)
    const timeZone = sanitizePlainText(formData.get('timeZone') ?? '', 60)
    const dateRaw = sanitizePlainText(formData.get('date') ?? '', 12)

    if ((startTime || endTime) && !timeZone) {
      return {
        ok: false,
        message: 'A session time can never be published without an explicit time zone. Add the time zone or clear the times.',
      }
    }
    const timePattern = /^\d{2}:\d{2}$/
    if ((startTime && !timePattern.test(startTime)) || (endTime && !timePattern.test(endTime))) {
      return { ok: false, message: 'Times must use the 24-hour HH:MM format.' }
    }

    const data = {
      title: sanitizePlainText(formData.get('title') ?? '', 180) || null,
      dayLabel: sanitizePlainText(formData.get('dayLabel') ?? '', 80) || null,
      date: dateRaw ? new Date(`${dateRaw}T00:00:00Z`) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      timeZone: timeZone || null,
      sessionType: sanitizePlainText(formData.get('sessionType') ?? '', 40) || null,
      description: sanitizePlainText(formData.get('description') ?? '', 2000) || null,
      platform: sanitizePlainText(formData.get('platform') ?? '', 120) || null,
      committeeId: sanitizePlainText(formData.get('committeeId') ?? '', 40) || null,
      order: Number(formData.get('order') ?? 0) || 0,
      published: formData.get('published') === 'on',
    }

    if (id) {
      await prisma.scheduleSession.update({ where: { id }, data })
    } else {
      await prisma.scheduleSession.create({ data })
    }
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: id ? 'schedule.session_updated' : 'schedule.session_created',
      entityType: 'ScheduleSession',
      entityId: id || data.title,
      summary: `${data.title ?? 'Session'} on ${data.dayLabel ?? 'an unlabelled day'}`,
      after: { startTime: data.startTime, endTime: data.endTime, timeZone: data.timeZone, published: data.published },
    })
    revalidatePath('/admin/schedule')
    revalidatePath('/schedule')
    return { ok: true, message: 'Session saved.' }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteScheduleSession(formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.scheduleManage)
    const id = String(formData.get('id') ?? '')
    await prisma.scheduleSession.delete({ where: { id } })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'schedule.session_deleted',
      entityType: 'ScheduleSession',
      entityId: id,
      summary: 'Deleted a schedule session',
    })
    revalidatePath('/admin/schedule')
    revalidatePath('/schedule')
    return { ok: true, message: 'Session deleted.' }
  } catch (error) {
    return failure(error)
  }
}

// ---------------------------------------------------------------------------
// Editorial content: FAQ, policies, announcements, settings
// ---------------------------------------------------------------------------

export async function upsertFaqItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.contentManage)
    const id = String(formData.get('id') ?? '')
    const question = sanitizePlainText(formData.get('question') ?? '', 300)
    if (question.length < 4) return { ok: false, message: 'Enter the question as a participant would ask it.' }

    const data = {
      question,
      answer: sanitizePlainText(formData.get('answer') ?? '', 4000) || null,
      category: sanitizePlainText(formData.get('category') ?? '', 60) || null,
      order: Number(formData.get('order') ?? 0) || 0,
      published: formData.get('published') === 'on',
    }

    if (id) await prisma.fAQItem.update({ where: { id }, data })
    else await prisma.fAQItem.create({ data })

    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: id ? 'faq.updated' : 'faq.created',
      entityType: 'FAQItem',
      entityId: id || question,
      summary: `FAQ: ${question}`,
    })
    revalidatePath('/admin/content')
    revalidatePath('/faq')
    return { ok: true, message: data.answer ? 'FAQ answer published.' : 'FAQ saved. It still shows [ANSWER — TBD] publicly.' }
  } catch (error) {
    return failure(error)
  }
}

export async function upsertPolicy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.contentManage)
    const slugInput = sanitizePlainText(formData.get('slug') ?? '', 80)
    const title = sanitizePlainText(formData.get('title') ?? '', 160)
    const slug = slugify(slugInput || title)
    if (!slug || !title) return { ok: false, message: 'A policy needs a title.' }

    const data = {
      slug,
      title,
      summary: sanitizePlainText(formData.get('summary') ?? '', 400) || null,
      body: sanitizePlainText(formData.get('body') ?? '', 12000) || null,
      version: sanitizePlainText(formData.get('version') ?? '', 20) || '1.0',
      published: formData.get('published') === 'on',
    }
    await prisma.policy.upsert({ where: { slug }, create: data, update: data })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'policy.upserted',
      entityType: 'Policy',
      entityId: slug,
      summary: `Policy "${title}" saved (v${data.version})`,
    })
    revalidatePath('/admin/content')
    revalidatePath(`/policies/${slug}`)
    return { ok: true, message: 'Policy saved.' }
  } catch (error) {
    return failure(error)
  }
}

export async function saveEventSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.settingsManage)
    const limiter = enforceRateLimit(`settings:${actor.id}`, 60, 10 * 60 * 1000)
    if (!limiter.ok) return { ok: false, message: limiter.message }

    // List and boolean fields are posted as `cfg.<path>.__list` and
    // `cfg.<path>.__boolean`. The whole suffix (including the separating dot)
    // is stripped, otherwise the derived path keeps a trailing dot and no
    // longer matches the configuration registry.
    const LIST_SUFFIX = '.__list'
    const BOOLEAN_SUFFIX = '.__boolean'

    const updates: Record<string, string | string[]> = {}
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('cfg.') || typeof value !== 'string') continue
      const path = key.slice(4)
      if (path.endsWith(LIST_SUFFIX)) {
        updates[path.slice(0, -LIST_SUFFIX.length)] = value
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      } else if (path.endsWith(BOOLEAN_SUFFIX)) {
        updates[path.slice(0, -BOOLEAN_SUFFIX.length)] = value
      } else {
        updates[path] = value
      }
    }

    const result = await saveConfig(updates, actor.id)
    if (result.errors.length) {
      return { ok: false, message: result.errors.join(' ') }
    }

    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'settings.updated',
      entityType: 'SiteSetting',
      entityId: null,
      summary: `Updated ${result.saved.length} event setting(s)`,
      after: { fields: result.saved },
    })

    revalidatePath('/admin/content')
    revalidatePath('/', 'layout')
    return { ok: true, message: `${result.saved.length} setting(s) saved. Public pages now use the new values.` }
  } catch (error) {
    return failure(error)
  }
}

export async function publishAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.contentManage)
    const title = sanitizePlainText(formData.get('title') ?? '', 200)
    if (title.length < 4) return { ok: false, message: 'Give the announcement a title.' }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body: sanitizePlainText(formData.get('body') ?? '', 4000) || null,
        severity: String(formData.get('severity') ?? 'info'),
        audience: String(formData.get('audience') ?? 'public'),
        publishedAt: formData.get('publishNow') === 'on' ? new Date() : null,
        authorId: actor.id,
      },
    })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'announcement.created',
      entityType: 'Announcement',
      entityId: announcement.id,
      summary: `Announcement "${title}" (${announcement.audience})`,
    })
    revalidatePath('/admin/communications')
    revalidatePath('/portal')
    return { ok: true, message: announcement.publishedAt ? 'Announcement published.' : 'Announcement saved as a draft.' }
  } catch (error) {
    return failure(error)
  }
}

// ---------------------------------------------------------------------------
// Communications
// ---------------------------------------------------------------------------

const communicationSchema = z.object({
  templateKey: z.string().trim().min(2).max(60),
  subject: z.string().trim().min(3, 'Add a subject line.').max(200),
  body: z.string().trim().min(10, 'Write the message body.').max(10000),
  audience: z.string().trim().min(1).max(80),
  kind: z.enum(['transactional', 'marketing']),
})

export async function audienceSize(audience: string): Promise<number> {
  await assertAdmin(PERMISSIONS.communicationsSend)
  return (await resolveAudience(audience)).length
}

async function resolveAudience(audience: string) {
  if (audience.startsWith('status:')) {
    const status = audience.slice('status:'.length).toUpperCase()
    return prisma.application.findMany({
      where: { status },
      select: { id: true, reference: true, participant: { select: { fullName: true, email: true } } },
    })
  }
  if (audience.startsWith('committee:')) {
    const committeeId = audience.slice('committee:'.length)
    return prisma.application.findMany({
      where: { assignedCommitteeId: committeeId, status: { in: ['ACCEPTED_PAYMENT_PENDING', 'CONFIRMED'] } },
      select: { id: true, reference: true, participant: { select: { fullName: true, email: true } } },
    })
  }
  if (audience === 'marketing_optin') {
    return prisma.application.findMany({
      where: {
        status: { notIn: ['DRAFT', 'WITHDRAWN', 'CANCELLED'] },
        participant: { consents: { some: { policySlug: 'marketing-updates', granted: true, revokedAt: null } } },
      },
      select: { id: true, reference: true, participant: { select: { fullName: true, email: true } } },
    })
  }
  return prisma.application.findMany({
    where: { status: { notIn: ['DRAFT'] } },
    select: { id: true, reference: true, participant: { select: { fullName: true, email: true } } },
  })
}

export async function previewCommunication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await gate(PERMISSIONS.communicationsSend)
    const parsed = communicationSchema.safeParse({
      templateKey: formData.get('templateKey'),
      subject: formData.get('subject'),
      body: formData.get('body'),
      audience: formData.get('audience'),
      kind: formData.get('kind') ?? 'transactional',
    })
    if (!parsed.success) {
      const { fieldErrors, message } = zodFieldErrors(parsed.error)
      return { ok: false, message, fieldErrors }
    }

    const recipients = await resolveAudience(parsed.data.audience)
    const variables = await templateVarsFor(recipients[0]?.id ?? '')
    const { text, unresolved } = renderTemplate(parsed.data.body, variables)

    return {
      ok: true,
      message: `Preview ready for ${recipients.length} recipient(s).`,
      data: {
        previewBody: text,
        recipients: recipients.length,
        unresolved: unresolved.length,
        unresolvedTokens: unresolved.join(', ') || null,
      },
    }
  } catch (error) {
    return failure(error)
  }
}

export async function sendCommunication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.communicationsSend)
    const limiter = enforceRateLimit(`comms:${actor.id}`, 10, 30 * 60 * 1000)
    if (!limiter.ok) return { ok: false, message: limiter.message }

    if (formData.get('confirmSend') !== 'on') {
      return { ok: false, message: 'Tick the confirmation box — bulk sends cannot be recalled.' }
    }

    const parsed = communicationSchema.safeParse({
      templateKey: formData.get('templateKey'),
      subject: formData.get('subject'),
      body: formData.get('body'),
      audience: formData.get('audience'),
      kind: formData.get('kind') ?? 'transactional',
    })
    if (!parsed.success) {
      const { fieldErrors, message } = zodFieldErrors(parsed.error)
      return { ok: false, message, fieldErrors }
    }

    const recipients = await resolveAudience(parsed.data.audience)
    if (!recipients.length) {
      return { ok: false, message: 'That audience currently contains no participants, so nothing was sent.' }
    }

    const communication = await prisma.communication.create({
      data: {
        templateKey: parsed.data.templateKey,
        subject: parsed.data.subject,
        body: parsed.data.body,
        audience: parsed.data.audience,
        kind: parsed.data.kind,
        status: 'sending',
        recipientCount: recipients.length,
        createdById: actor.id,
      },
    })

    let sent = 0
    let failed = 0
    for (const recipient of recipients) {
      const variables = await templateVarsFor(recipient.id)
      const subject = renderTemplate(parsed.data.subject, variables).text
      const body = renderTemplate(parsed.data.body, variables).text
      const result = await sendEmail({
        to: recipient.participant.email,
        subject,
        body,
        templateKey: parsed.data.templateKey,
        kind: parsed.data.kind,
      })
      if (result.status === 'failed') failed += 1
      else sent += 1
      await prisma.communicationRecipient.create({
        data: {
          communicationId: communication.id,
          applicationId: recipient.id,
          email: recipient.participant.email,
          status: result.status === 'failed' ? 'failed' : result.status === 'sent' ? 'sent' : 'queued',
          error: result.error ?? null,
          sentAt: result.status === 'sent' ? new Date() : null,
        },
      })
    }

    await prisma.communication.update({
      where: { id: communication.id },
      data: {
        status: failed && !sent ? 'failed' : 'sent',
        sentCount: sent,
        failedCount: failed,
        sentAt: new Date(),
      },
    })

    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'communication.sent',
      entityType: 'Communication',
      entityId: communication.id,
      summary: `Sent "${parsed.data.subject}" to ${recipients.length} recipient(s) as ${parsed.data.kind}`,
      after: { audience: parsed.data.audience, sent, failed },
    })

    revalidatePath('/admin/communications')
    return {
      ok: true,
      message: `${sent} message(s) queued${failed ? `, ${failed} failed` : ''}. Delivery status is recorded in the communication history.`,
    }
  } catch (error) {
    return failure(error)
  }
}

// ---------------------------------------------------------------------------
// Staff & roles
// ---------------------------------------------------------------------------

export async function createStaffUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.staffManage)
    const email = sanitizePlainText(formData.get('email') ?? '', 200).toLowerCase()
    const name = sanitizePlainText(formData.get('name') ?? '', 120)
    const roleKey = sanitizePlainText(formData.get('roleKey') ?? '', 40)
    const password = String(formData.get('password') ?? '')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Enter a valid email address.' }
    if (name.length < 2) return { ok: false, message: 'Enter the staff member’s name.' }

    const issues = passwordIssues(password)
    if (issues.length) return { ok: false, message: issues.join(' ') }

    const role = await prisma.adminRole.findUnique({ where: { key: roleKey } })
    if (!role) return { ok: false, message: 'Choose a valid role.' }

    const existing = await prisma.adminUser.findUnique({ where: { email } })
    if (existing) return { ok: false, message: 'An organizer account already exists for that email address.' }

    const created = await prisma.adminUser.create({
      data: { email, name, roleId: role.id, passwordHash: await hashPassword(password) },
    })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'staff.created',
      entityType: 'AdminUser',
      entityId: created.id,
      summary: `Created ${role.name} account for ${name}`,
      after: { email, roleKey },
    })

    revalidatePath('/admin/staff')
    return { ok: true, message: 'Organizer account created. Share credentials through a secure channel.' }
  } catch (error) {
    return failure(error)
  }
}

export async function updateStaffUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.staffManage)
    const id = String(formData.get('id') ?? '')
    const action = String(formData.get('action') ?? '')

    const staff = await prisma.adminUser.findUnique({ where: { id }, include: { role: true } })
    if (!staff) return { ok: false, message: 'That account no longer exists.' }
    if (staff.id === actor.id && action !== 'enable_mfa') {
      return { ok: false, message: 'You cannot change your own role or disable your own account.' }
    }

    if (action === 'disable') {
      await prisma.adminUser.update({ where: { id }, data: { disabledAt: new Date() } })
      await revokeAllSessions('admin', id)
    } else if (action === 'enable') {
      await prisma.adminUser.update({ where: { id }, data: { disabledAt: null, failedLogins: 0, lockedUntil: null } })
    } else if (action === 'change_role') {
      const role = await prisma.adminRole.findUnique({ where: { key: String(formData.get('roleKey') ?? '') } })
      if (!role) return { ok: false, message: 'Choose a valid role.' }
      await prisma.adminUser.update({ where: { id }, data: { roleId: role.id } })
      await recordAudit({
        actorType: 'admin',
        actorId: actor.id,
        actorLabel: actor.name,
        action: 'staff.role_changed',
        entityType: 'AdminUser',
        entityId: id,
        summary: `${staff.name}: ${staff.role.name} → ${role.name}`,
        before: { role: staff.role.name },
        after: { role: role.name },
      })
    } else if (action === 'reset_password') {
      const password = String(formData.get('password') ?? '')
      const issues = passwordIssues(password)
      if (issues.length) return { ok: false, message: issues.join(' ') }
      await prisma.adminUser.update({ where: { id }, data: { passwordHash: await hashPassword(password) } })
      await revokeAllSessions('admin', id)
    } else if (action === 'enable_mfa') {
      const secret = generateTotpSecret()
      const code = String(formData.get('mfaCode') ?? '')
      if (!verifyTotp(secret, code)) {
        // The secret is only persisted once a valid code proves the app pairing.
        return { ok: false, message: 'That code did not match. Check your authenticator app and try again.', data: { newSecret: secret } }
      }
      await prisma.adminUser.update({ where: { id }, data: { mfaEnabled: true, mfaSecret: secret } })
    } else if (action === 'disable_mfa') {
      await prisma.adminUser.update({ where: { id }, data: { mfaEnabled: false, mfaSecret: null } })
    } else {
      return { ok: false, message: 'Unsupported action.' }
    }

    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: `staff.${action}`,
      entityType: 'AdminUser',
      entityId: id,
      summary: `Staff account ${action.replace('_', ' ')} for ${staff.name}`,
    })
    revalidatePath('/admin/staff')
    return { ok: true, message: 'Staff account updated.' }
  } catch (error) {
    return failure(error)
  }
}

export async function generateTotpForSelf(): Promise<{ secret: string } | { error: string }> {
  try {
    const admin = await assertAdmin()
    const secret = generateTotpSecret()
    // Stored as pending until verified — see verifySelfTotp.
    await prisma.adminUser.update({ where: { id: admin.id }, data: { mfaSecret: secret, mfaEnabled: false } })
    await recordAudit({
      actorType: 'admin',
      actorId: admin.id,
      actorLabel: admin.name,
      action: 'staff.mfa_enrolment_started',
      entityType: 'AdminUser',
      entityId: admin.id,
      summary: 'Started MFA enrolment',
    })
    return { secret }
  } catch (error) {
    return { error: failure(error).message ?? 'MFA enrolment could not be started.' }
  }
}

export async function verifySelfTotp(code: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin()
    const record = await prisma.adminUser.findUnique({ where: { id: admin.id } })
    if (!record?.mfaSecret) return { ok: false, message: 'Start enrolment first.' }
    if (!verifyTotp(record.mfaSecret, code)) {
      return { ok: false, message: 'That code did not match. Codes rotate every 30 seconds.' }
    }
    await prisma.adminUser.update({ where: { id: admin.id }, data: { mfaEnabled: true } })
    await recordAudit({
      actorType: 'admin',
      actorId: actorSafe(admin.id),
      actorLabel: admin.name,
      action: 'staff.mfa_enabled',
      entityType: 'AdminUser',
      entityId: admin.id,
      summary: 'MFA enabled for own account',
    })
    revalidatePath('/admin/settings')
    return { ok: true, message: 'Multi-factor authentication is now active on your account.' }
  } catch (error) {
    return failure(error)
  }
}

function actorSafe(value: string) {
  return value
}

export async function updateRolePermissions(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.staffManage)
    const roleKey = String(formData.get('roleKey') ?? '')
    const role = await prisma.adminRole.findUnique({ where: { key: roleKey } })
    if (!role) return { ok: false, message: 'Unknown role.' }
    if (role.isSystem && ROLE_PRESETS.some((preset) => preset.key === roleKey && preset.key === 'super_admin')) {
      return { ok: false, message: 'The director role always keeps full control of the platform.' }
    }

    const granted = formData.getAll('permissions').map(String)
    await prisma.adminRole.update({ where: { key: roleKey }, data: { permissions: stringifyJson(granted) } })
    await recordAudit({
      actorType: 'admin',
      actorId: actor.id,
      actorLabel: actor.name,
      action: 'role.permissions_updated',
      entityType: 'AdminRole',
      entityId: roleKey,
      summary: `${role.name}: ${granted.length} permission(s)`,
      before: { permissions: role.permissions },
      after: { permissions: granted },
    })
    revalidatePath('/admin/staff')
    return { ok: true, message: 'Role permissions updated. Changes apply to the next request.' }
  } catch (error) {
    return failure(error)
  }
}

export async function testMailTransport(): Promise<ActionState> {
  try {
    const actor = await gate(PERMISSIONS.settingsManage)
    const config = await getEventConfig()
    const support = config.text('contact.supportEmail')
    if (!support) return { ok: false, message: 'Set the support email in Contact & social before sending a test.' }
    const result = await sendEmail({
      to: actor.id ? support : support,
      subject: 'Trishul Summit — transport test',
      body: 'This is a delivery test from the organizer workspace.',
      templateKey: 'transport_test',
    })
    return {
      ok: result.status !== 'failed',
      message:
        result.status === 'sent'
          ? 'Test message sent.'
          : 'No mail transport is configured yet — the message was recorded in the delivery log with status "queued".',
    }
  } catch (error) {
    return failure(error)
  }
}

export async function adminIpFingerprint() {
  return clientIp()
}
