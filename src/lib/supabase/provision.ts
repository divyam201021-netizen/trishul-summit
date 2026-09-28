import { prisma } from '@/lib/db/client'
import { getSupabaseIdentity, type SupabaseIdentity } from './server'
import { saveRegistryProfile, type RegistryOutcome, type RegistryProfile } from './registry'
import { isSupabaseConfigured } from './config'

/**
 * ============================================================================
 * PROVISIONING — one identity, two stores, no silent drift
 * ============================================================================
 * Supabase Auth owns the credential. The application database owns the
 * relational record the portal and organizer workspace already work against.
 * The registry in Supabase owns the participant-facing copy the organizing
 * committee manages.
 *
 * This module is the single place those are tied together:
 *
 *   `Participant.authUserId`  ⇄  `trishul_participants.auth_user_id`
 *   `Participant.id`          ⇄  `trishul_participants.app_participant_id`
 *
 * Linking is idempotent and reconciles an existing record rather than creating
 * a duplicate: an applicant who registered under the old email/password flow
 * and then signs in through the gate keeps the SAME application, and simply
 * gains the Supabase identity.
 */

export interface ProvisionResult {
  ok: boolean
  message?: string
  participant: { id: string; email: string; fullName: string } | null
  registry: RegistryOutcome | null
  /** True when this call created the application record. */
  created: boolean
}

/**
 * Resolves (and if necessary creates) the application participant record for a
 * Supabase identity, and mirrors the profile into the registry.
 *
 * Deliberately does NOT start an application session: this may run during a
 * Server Component render, where writing cookies is illegal. The session is
 * established later, from a Server Action.
 */
export async function ensureLinkedParticipant(
  identity: SupabaseIdentity,
  profile: RegistryProfile = {},
): Promise<ProvisionResult> {
  const email = (identity.email ?? '').trim().toLowerCase()
  if (!email) {
    return {
      ok: false,
      message: 'Your sign-in method did not provide an email address, which the application needs.',
      participant: null,
      registry: null,
      created: false,
    }
  }

  let participant = await prisma.participant.findUnique({ where: { authUserId: identity.id } })
  let created = false

  if (!participant) {
    // An applicant who registered before the gate existed: adopt the existing
    // record instead of forking a second application.
    const existing = await prisma.participant.findUnique({ where: { email } })

    if (existing) {
      participant = await prisma.participant.update({
        where: { id: existing.id },
        data: { authUserId: identity.id },
      })
    } else {
      participant = await prisma.participant.create({
        data: {
          authUserId: identity.id,
          email,
          fullName: identity.fullName?.trim() || email,
          // Credentials live in Supabase Auth; there is no local hash.
          passwordHash: null,
        },
      })
      created = true
    }
  }

  const registry = isSupabaseConfigured()
    ? await saveRegistryProfile(
        identity,
        {
          fullName: profile.fullName ?? identity.fullName ?? participant.fullName,
          country: profile.country ?? participant.country ?? undefined,
          region: profile.region ?? participant.region ?? undefined,
          timeZone: profile.timeZone ?? participant.timeZone ?? undefined,
          institution: profile.institution ?? participant.institution ?? undefined,
          participantCategory: profile.participantCategory ?? participant.participantCategory ?? undefined,
          ageBand: profile.ageBand ?? participant.ageBand ?? undefined,
          preferredLanguage: profile.preferredLanguage ?? participant.preferredLanguage ?? undefined,
          phone: profile.phone ?? participant.phone ?? undefined,
          guardianEmail: profile.guardianEmail ?? participant.guardianEmail ?? undefined,
        },
        participant.id,
      )
    : null

  return {
    ok: true,
    participant: { id: participant.id, email: participant.email, fullName: participant.fullName },
    registry,
    created,
  }
}

/**
 * The participant record for the current request, preferring the Supabase
 * identity and falling back to the application session.
 *
 * The fallback preserves the participant portal for anyone holding an
 * application session, so introducing the gate never signs an existing
 * applicant out of an application they had already started.
 */
export async function resolveRegistrationParticipant(profile: RegistryProfile = {}): Promise<
  | { ok: true; participant: { id: string; email: string; fullName: string }; registry: RegistryOutcome | null }
  | { ok: false; message: string; needsIdentity: boolean }
> {
  if (isSupabaseConfigured()) {
    const identity = await getSupabaseIdentity()
    if (identity) {
      const provisioned = await ensureLinkedParticipant(identity, profile)
      if (provisioned.ok && provisioned.participant) {
        return { ok: true, participant: provisioned.participant, registry: provisioned.registry }
      }
      return { ok: false, message: provisioned.message ?? 'We could not prepare your application.', needsIdentity: true }
    }
  }

  const { getCurrentParticipant } = await import('@/lib/auth/session')
  const session = await getCurrentParticipant()
  if (session) {
    return { ok: true, participant: { id: session.id, email: session.email, fullName: session.fullName }, registry: null }
  }

  return {
    ok: false,
    message: 'Your session has ended. Sign in again to continue your application.',
    needsIdentity: true,
  }
}
