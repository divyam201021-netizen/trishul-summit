'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { startParticipantSession } from '@/lib/auth/session'
import { requireParticipant } from '@/lib/auth/guards'
import { recordAudit } from '@/lib/audit'
import { clientIp, clientIpHash, enforceRateLimit, userAgent } from '@/lib/security/request'
import { nameSchema, sanitizePlainText, zodFieldErrors, type ActionState } from '@/lib/security/validation'
import { generateApplicationReference } from '@/lib/utils'
import { getEventConfig } from '@/lib/config'
import { renderTemplate, TEMPLATE_BY_KEY } from '@/lib/mail/templates'
import { sendEmail } from '@/lib/mail/transport'
import { getSupabaseIdentity } from '@/lib/supabase/server'
import { resolveRegistrationParticipant } from '@/lib/supabase/provision'
import {
  ensureRegistryRegistration,
  markRegistrySubmitted,
  saveRegistryConsents,
  saveRegistryMun,
  saveRegistryPreferences,
  saveRegistryProfile,
  withdrawRegistryRegistration,
} from '@/lib/supabase/registry'

/**
 * ============================================================================
 * REGISTRATION
 * ============================================================================
 * The flow is progressive: step 1 creates the participant account and a DRAFT
 * application, later steps save onto that draft, and submission freezes the
 * content the reviewer sees. Applicants can always come back — the session
 * identifies them, and a reference is never needed in a URL.
 *
 * Every mutating action validates server-side, is rate-limited, records an
 * audit event and returns only safe, actionable messages.
 */

const MIN_FORM_SECONDS = 3

function spamGuard(formData: FormData): { ok: true } | { ok: false; message: string } {
  // Honeypot field: hidden from humans, irresistible to naive bots.
  if (typeof formData.get('website') === 'string' && String(formData.get('website')).trim() !== '') {
    return { ok: false, message: 'We could not verify this submission. Please try again.' }
  }
  const startedAt = Number(formData.get('formStartedAt') ?? 0)
  if (startedAt && Date.now() - startedAt < MIN_FORM_SECONDS * 1000) {
    return { ok: false, message: 'That was submitted a little too quickly. Please review your details and try again.' }
  }
  return { ok: true }
}

function optionalString(formData: FormData, key: string, max = 160) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? sanitizePlainText(value, max) : null
}

async function draftFor(participantId: string) {
  const existing = await prisma.application.findFirst({
    where: { participantId, status: 'DRAFT' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing
  return prisma.application.create({
    data: { participantId, reference: generateApplicationReference(), status: 'DRAFT' },
  })
}

async function syncPreferences(applicationId: string, committeeIds: (string | null)[]) {
  const unique = committeeIds.filter((id): id is string => Boolean(id))
  const valid = await prisma.committee.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  })
  const validIds = new Set(valid.map((committee) => committee.id))

  await prisma.$transaction([
    prisma.applicationPreference.deleteMany({ where: { applicationId } }),
    prisma.applicationPreference.createMany({
      data: unique
        .filter((id) => validIds.has(id))
        .map((committeeId, index) => ({ applicationId, committeeId, rank: index + 1 })),
    }),
  ])
}

/**
 * Resolves the registry ids for the current applicant's live application.
 *
 * Best effort by design: the registry is a second copy, and an applicant must
 * never be blocked from registering because a mirror write failed. The caller
 * records the failure in the audit trail instead.
 */
async function registryIds(appParticipantId: string, application: { id: string; reference: string }) {
  const identity = await getSupabaseIdentity()
  if (!identity) return null

  const participant = await saveRegistryProfile(identity, {}, appParticipantId)
  if (!participant.ok || !participant.participantId) return null

  const registration = await ensureRegistryRegistration(participant.participantId, application.id, application.reference)
  if (!registration.ok || !registration.registrationId) return null

  return { participantId: participant.participantId, registrationId: registration.registrationId }
}

/**
 * Records that a mirror write failed, without exposing provider internals to
 * the applicant. Keeps the two stores honestly reconcilable after the fact.
 */
async function noteMirrorFailure(participantId: string, step: string, message: string | undefined) {
  await recordAudit({
    actorType: 'participant',
    actorId: participantId,
    action: 'registry.mirror_failed',
    entityType: 'Participant',
    entityId: participantId,
    summary: `Registry mirror failed at ${step}`,
    after: { step, detail: (message ?? 'unknown').slice(0, 300) },
  })
}

// ---------------------------------------------------------------------------
// Step 1 — personal information (the identity already exists)
// ---------------------------------------------------------------------------
// Email and password are no longer collected here: Supabase Auth owns the
// credential, and the applicant is already signed in by the time they reach
// this step. Name and email are read from the verified identity.

const personalSchema = z.object({
  fullName: nameSchema.optional(),
  country: z.string().trim().min(2, 'Select your country or region.').max(90),
  timeZone: z.string().trim().min(1, 'Select your time zone.').max(60),
  institution: z.string().trim().min(2, 'Enter your school, university or institution.').max(160),
  participantCategory: z.string().trim().min(2, 'Select a participant category.').max(60),
  ageBand: z.string().trim().max(20).optional(),
  preferredLanguage: z.string().trim().max(60).optional(),
})

export async function savePersonalInformation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = spamGuard(formData)
  if (!guard.ok) return { ok: false, message: guard.message }

  const limiter = enforceRateLimit(`register:step1:${await clientIp()}`, 12, 60 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const parsed = personalSchema.safeParse({
    fullName: formData.get('fullName') ?? undefined,
    country: formData.get('country'),
    timeZone: formData.get('timeZone'),
    institution: formData.get('institution'),
    participantCategory: formData.get('participantCategory'),
    ageBand: formData.get('ageBand') ?? undefined,
    preferredLanguage: formData.get('preferredLanguage') ?? undefined,
  })

  if (!parsed.success) {
    const { fieldErrors, message } = zodFieldErrors(parsed.error)
    return { ok: false, message, fieldErrors }
  }

  const data = parsed.data

  // The identity is the authority. Profile fields are mirrored onto it, and the
  // application record is created or adopted from it.
  const resolved = await resolveRegistrationParticipant({
    fullName: data.fullName ? sanitizePlainText(data.fullName, 120) : null,
    country: data.country,
    timeZone: data.timeZone,
    institution: data.institution,
    participantCategory: data.participantCategory,
    ageBand: data.ageBand ? sanitizePlainText(data.ageBand, 20) : null,
    preferredLanguage: data.preferredLanguage ? sanitizePlainText(data.preferredLanguage, 60) : null,
  })

  if (!resolved.ok) {
    return {
      ok: false,
      message: resolved.message,
      data: resolved.needsIdentity ? { needsIdentity: true } : undefined,
    }
  }

  const participant = resolved.participant

  await prisma.participant.update({
    where: { id: participant.id },
    data: {
      ...(data.fullName ? { fullName: sanitizePlainText(data.fullName, 120) } : {}),
      country: data.country,
      timeZone: data.timeZone,
      institution: data.institution,
      participantCategory: data.participantCategory,
      ageBand: data.ageBand ? sanitizePlainText(data.ageBand, 20) : null,
      preferredLanguage: data.preferredLanguage ? sanitizePlainText(data.preferredLanguage, 60) : null,
      lastLoginAt: new Date(),
    },
  })

  const application = await draftFor(participant.id)

  // Bridge session: the participant portal still authenticates with the
  // application's own cookie, so it is established here — inside a Server
  // Action, where writing cookies is legal — now that the identity is proven.
  await startParticipantSession(participant.id, await clientIpHash(), await userAgent())

  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    action: 'registration.started',
    entityType: 'Application',
    entityId: application.id,
    summary: 'Applicant saved their personal information',
  })

  return { ok: true, message: 'Saved. Continue to your MUN information.', data: { step: 2 } }
}

// ---------------------------------------------------------------------------
// Step 2 — MUN information & committee preferences
// ---------------------------------------------------------------------------

const munSchema = z.object({
  munExperience: z.enum(['none', 'school', 'conference', 'multiple'], {
    errorMap: () => ({ message: 'Select your previous MUN or debate experience.' }),
  }),
  experienceDetail: z.string().trim().max(600).optional(),
  rolePreference: z.string().trim().max(60).optional(),
  motivation: z.string().trim().max(1200).optional(),
  topicInterest: z.string().trim().max(300).optional(),
})

export async function saveMunInformation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = spamGuard(formData)
  if (!guard.ok) return { ok: false, message: guard.message }

  const resolved = await resolveRegistrationParticipant()
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, data: resolved.needsIdentity ? { needsIdentity: true } : undefined }
  }
  const participant = resolved.participant

  const parsed = munSchema.safeParse({
    munExperience: formData.get('munExperience') ?? undefined,
    experienceDetail: formData.get('experienceDetail') ?? undefined,
    rolePreference: formData.get('rolePreference') ?? undefined,
    motivation: formData.get('motivation') ?? undefined,
    topicInterest: formData.get('topicInterest') ?? undefined,
  })
  if (!parsed.success) {
    const { fieldErrors, message } = zodFieldErrors(parsed.error)
    return { ok: false, message, fieldErrors }
  }

  const draft = await draftFor(participant.id)
  await prisma.application.update({
    where: { id: draft.id },
    data: {
      munExperience: parsed.data.munExperience,
      experienceDetail: sanitizePlainText(parsed.data.experienceDetail ?? '', 600) || null,
      rolePreference: sanitizePlainText(parsed.data.rolePreference ?? '', 60) || null,
      motivation: sanitizePlainText(parsed.data.motivation ?? '', 1200) || null,
      topicInterest: sanitizePlainText(parsed.data.topicInterest ?? '', 300) || null,
    },
  })

  const preferenceIds = [
    optionalString(formData, 'preference1', 40),
    optionalString(formData, 'preference2', 40),
    optionalString(formData, 'preference3', 40),
  ]

  await syncPreferences(draft.id, preferenceIds)

  // Mirror into the participant registry the organizing committee manages.
  const registry = await registryIds(participant.id, draft)
  if (registry) {
    const mun = await saveRegistryMun(registry.registrationId, {
      munExperience: parsed.data.munExperience,
      experienceDetail: parsed.data.experienceDetail ?? null,
      rolePreference: parsed.data.rolePreference ?? null,
      motivation: parsed.data.motivation ?? null,
      topicInterest: parsed.data.topicInterest ?? null,
      currentStep: 3,
      completedSteps: ['personal', 'mun'],
    })
    if (!mun.ok) await noteMirrorFailure(participant.id, 'mun', mun.message)

    // A preference is stored with a snapshot of the committee as it read when
    // it was chosen, so a later rename never rewrites the applicant's history.
    const chosenIds = preferenceIds.filter((id): id is string => Boolean(id))
    const chosen = chosenIds.length
      ? await prisma.committee.findMany({
          where: { id: { in: chosenIds } },
          select: { id: true, slug: true, name: true, type: true },
        })
      : []
    const byId = new Map(chosen.map((committee) => [committee.id, committee]))

    const preferences = await saveRegistryPreferences(
      registry.registrationId,
      preferenceIds.map((id) => {
        if (!id) return null
        const committee = byId.get(id)
        return {
          committeeId: id,
          slug: committee?.slug ?? null,
          name: committee?.name ?? null,
          type: committee?.type ?? null,
        }
      }),
    )
    if (!preferences.ok) await noteMirrorFailure(participant.id, 'preferences', preferences.message)
  }

  revalidatePath('/register')
  return { ok: true, message: 'Saved. Continue to policies and consent.', data: { step: 3 } }
}

// ---------------------------------------------------------------------------
// Step 3 — policies & consent
// ---------------------------------------------------------------------------

export async function savePolicies(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const resolved = await resolveRegistrationParticipant()
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, data: resolved.needsIdentity ? { needsIdentity: true } : undefined }
  }
  const participant = resolved.participant

  const required = {
    'participation-terms': formData.get('terms') === 'on',
    'code-of-conduct': formData.get('conduct') === 'on',
    'privacy-notice': formData.get('privacy') === 'on',
  }
  const missing = Object.entries(required).filter(([, granted]) => !granted)

  if (missing.length) {
    return {
      ok: false,
      message: 'The participation terms, code of conduct and privacy notice must all be acknowledged before you can submit.',
      fieldErrors: Object.fromEntries(missing.map(([key]) => [key === 'participation-terms' ? 'terms' : key === 'code-of-conduct' ? 'conduct' : 'privacy', 'Required to continue.'])),
    }
  }

  // Required consent and optional marketing consent are stored separately.
  const marketing = formData.get('marketing') === 'on'
  const config = await getEventConfig()
  const version = config.text('legal.policyVersion') ?? '1.0'

  await prisma.consent.deleteMany({
    where: { participantId: participant.id, grantedAt: { not: null } },
  })
  for (const [slug, granted] of Object.entries(required)) {
    await prisma.consent.create({
      data: { participantId: participant.id, policySlug: slug, kind: 'required', granted, version, grantedAt: new Date() },
    })
  }
  await prisma.consent.create({
    data: {
      participantId: participant.id,
      policySlug: 'marketing-updates',
      kind: 'optional',
      granted: marketing,
      version,
      grantedAt: marketing ? new Date() : null,
    },
  })

  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    action: 'registration.consent_recorded',
    entityType: 'Consent',
    entityId: participant.id,
    summary: `Required consents recorded; marketing consent ${marketing ? 'granted' : 'declined'}`,
    after: { ...required, marketing },
  })

  // Mirror the consent bundle. Required acknowledgements and the optional
  // marketing consent are written as separate rows in both stores.
  const application = await prisma.application.findFirst({
    where: { participantId: participant.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, reference: true },
  })
  if (application) {
    const registry = await registryIds(participant.id, application)
    if (registry) {
      const mirrored = await saveRegistryConsents(registry.registrationId, registry.participantId, [
        ...Object.entries(required).map(([slug, granted]) => ({
          slug,
          kind: 'required' as const,
          granted,
          version,
        })),
        { slug: 'marketing-updates', kind: 'optional' as const, granted: marketing, version },
      ])
      if (!mirrored.ok) await noteMirrorFailure(participant.id, 'consent', mirrored.message)
    }
  }

  return { ok: true, message: 'Consent recorded. Review your application before submitting.', data: { step: 4 } }
}

// ---------------------------------------------------------------------------
// Step 5 — submit
// ---------------------------------------------------------------------------

export async function submitApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const resolved = await resolveRegistrationParticipant()
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, data: resolved.needsIdentity ? { needsIdentity: true } : undefined }
  }
  const participant = resolved.participant

  const limiter = enforceRateLimit(`register:submit:${participant.id}`, 5, 60 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const confirm = formData.get('confirmAccuracy') === 'on'
  if (!confirm) {
    return {
      ok: false,
      message: 'Please confirm that the information you have provided is accurate.',
      fieldErrors: { confirmAccuracy: 'Confirmation required before submitting.' },
    }
  }

  const draft = await prisma.application.findFirst({
    where: { participantId: participant.id, status: 'DRAFT' },
    include: { preferences: true },
  })
  if (!draft) {
    const existing = await prisma.application.findFirst({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'desc' },
    })
    if (existing && existing.status !== 'DRAFT') {
      return { ok: true, message: 'Your application has already been submitted.', data: { step: 5 } }
    }
    return { ok: false, message: 'We could not find your draft application. Start again from step 1 or contact support.' }
  }

  const missingSteps: string[] = []
  if (!draft.munExperience) missingSteps.push('MUN information')
  if (draft.preferences.length === 0) missingSteps.push('at least one committee preference')
  const consents = await prisma.consent.count({
    where: { participantId: participant.id, kind: 'required', granted: true },
  })
  if (consents < 3) missingSteps.push('policy acknowledgements')

  if (missingSteps.length) {
    return {
      ok: false,
      message: `Before submitting, please complete: ${missingSteps.join(', ')}.`,
    }
  }

  const config = await getEventConfig()

  const updated = await prisma.application.update({
    where: { id: draft.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      policyVersion: config.text('legal.policyVersion') ?? '1.0',
    },
  })

  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: updated.id,
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      publicNote: 'Application received. The organizing committee will review it.',
    },
  })

  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    action: 'registration.submitted',
    entityType: 'Application',
    entityId: updated.id,
    summary: `Application ${updated.reference} submitted`,
    before: { status: 'DRAFT' },
    after: { status: 'SUBMITTED' },
  })

  // Mirror the submission into the participant registry: status, submission
  // integrity metadata, and the first entry of the (append-only) status trail.
  const registry = await registryIds(participant.id, updated)
  if (registry) {
    const startedAt = Number(formData.get('formStartedAt') ?? 0)
    const mirrored = await markRegistrySubmitted(registry.registrationId, registry.participantId, {
      policyVersion: updated.policyVersion ?? null,
      completedSteps: ['personal', 'mun', 'policies', 'review'],
      confirmedAccuracyAt: new Date().toISOString(),
      formStartedAt: startedAt ? new Date(startedAt).toISOString() : null,
      ipHash: await clientIpHash(),
      userAgent: await userAgent(),
      publicNote: 'Application received. The organizing committee will review it.',
    })
    if (!mirrored.ok) await noteMirrorFailure(participant.id, 'submission', mirrored.message)
  }

  // Transactional confirmation. Delivery is recorded even when no mail
  // transport is configured, so nothing is silently lost.
  const template = TEMPLATE_BY_KEY.application_submitted
  if (template) {
    const { text: body } = renderTemplate(template.body, {
      'PARTICIPANT NAME': participant.fullName,
      'APPLICATION REFERENCE': updated.reference,
      'EVENT DATE': config.text('event.dateSummary'),
      'TIME ZONE': config.text('event.timeZone'),
      'SUPPORT EMAIL': config.text('contact.supportEmail'),
      'NEXT STEP': config.text('event.nextStepAfterSubmission'),
    })
    const { text: subject } = renderTemplate(template.subject, {
      'APPLICATION REFERENCE': updated.reference,
    })
    await sendEmail({ to: participant.email, subject, body, templateKey: template.key })
  }

  revalidatePath('/register')
  revalidatePath('/portal')
  return { ok: true, message: 'Application submitted.', data: { step: 6, reference: updated.reference } }
}

// ---------------------------------------------------------------------------
// Portal: edits allowed only while a participant may still change them
// ---------------------------------------------------------------------------

const EDITABLE_STATUSES = ['DRAFT', 'ACTION_REQUIRED']

export async function updateAllowedInformation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const participant = await requireParticipant('/portal/application')
  const limiter = enforceRateLimit(`portal:update:${participant.id}`, 20, 60 * 60 * 1000)
  if (!limiter.ok) return { ok: false, message: limiter.message }

  const application = await prisma.application.findFirst({
    where: { participantId: participant.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!application) return { ok: false, message: 'We could not find your application. Contact support if this looks wrong.' }
  if (!EDITABLE_STATUSES.includes(application.status.toUpperCase())) {
    return {
      ok: false,
      message:
        'Your application is locked because it is already being processed. Contact support if something needs correcting.',
    }
  }

  const parsed = z
    .object({
      country: z.string().trim().min(2).max(90),
      timeZone: z.string().trim().min(1).max(60),
      institution: z.string().trim().min(2).max(160),
      preferredLanguage: z.string().trim().max(60).optional(),
    })
    .safeParse({
      country: formData.get('country'),
      timeZone: formData.get('timeZone'),
      institution: formData.get('institution'),
      preferredLanguage: formData.get('preferredLanguage') ?? undefined,
    })

  if (!parsed.success) {
    const { fieldErrors, message } = zodFieldErrors(parsed.error)
    return { ok: false, message, fieldErrors }
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: {
      country: parsed.data.country,
      timeZone: parsed.data.timeZone,
      institution: parsed.data.institution,
      preferredLanguage: sanitizePlainText(parsed.data.preferredLanguage ?? '', 60) || null,
    },
  })

  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    action: 'portal.information_updated',
    entityType: 'Participant',
    entityId: participant.id,
    summary: 'Participant updated editable information',
  })

  revalidatePath('/portal/application')
  return { ok: true, message: 'Your information has been updated.' }
}

export async function setMarketingConsent(granted: boolean): Promise<ActionState> {
  const participant = await requireParticipant('/portal')
  const existing = await prisma.consent.findFirst({
    where: { participantId: participant.id, policySlug: 'marketing-updates' },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    await prisma.consent.update({
      where: { id: existing.id },
      data: { granted, grantedAt: granted ? new Date() : existing.grantedAt, revokedAt: granted ? null : new Date() },
    })
  } else {
    await prisma.consent.create({
      data: {
        participantId: participant.id,
        policySlug: 'marketing-updates',
        kind: 'optional',
        granted,
        grantedAt: granted ? new Date() : null,
      },
    })
  }

  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    action: granted ? 'portal.marketing_consent_granted' : 'portal.marketing_consent_revoked',
    entityType: 'Consent',
    entityId: participant.id,
    summary: `Marketing communication consent ${granted ? 'granted' : 'revoked'}`,
  })

  revalidatePath('/portal')
  return { ok: true, message: granted ? 'You will receive optional updates.' : 'Optional updates turned off.' }
}

export async function withdrawApplication(): Promise<ActionState> {
  const participant = await requireParticipant('/portal/application')
  const application = await prisma.application.findFirst({
    where: { participantId: participant.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!application) return { ok: false, message: 'We could not find your application.' }
  if (['WITHDRAWN', 'CANCELLED', 'DECLINED'].includes(application.status.toUpperCase())) {
    return { ok: false, message: 'This application can no longer be withdrawn online. Contact support for help.' }
  }

  await prisma.application.update({
    where: { id: application.id },
    data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
  })
  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: application.id,
      fromStatus: application.status,
      toStatus: 'WITHDRAWN',
      publicNote: 'Withdrawn by the applicant.',
    },
  })
  await recordAudit({
    actorType: 'participant',
    actorId: participant.id,
    action: 'portal.application_withdrawn',
    entityType: 'Application',
    entityId: application.id,
    summary: `Application ${application.reference} withdrawn by applicant`,
    before: { status: application.status },
    after: { status: 'WITHDRAWN' },
  })

  // Mirror the withdrawal and append its status event.
  const registry = await registryIds(participant.id, application)
  if (registry) {
    const mirrored = await withdrawRegistryRegistration(registry.registrationId, application.status)
    if (!mirrored.ok) await noteMirrorFailure(participant.id, 'withdrawal', mirrored.message)
  }

  revalidatePath('/portal')
  return { ok: true, message: 'Your application has been withdrawn. Contact support if this was a mistake.' }
}
