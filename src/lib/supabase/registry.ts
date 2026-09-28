import { supabaseServer } from './server'
import { isSupabaseConfigured } from './config'
import type { SupabaseIdentity } from './server'

/**
 * ============================================================================
 * PARTICIPANT REGISTRY (Supabase)
 * ============================================================================
 * Every value an applicant supplies is mirrored into the `trishul_*` tables so
 * the organizing committee can manage participants — status, history and every
 * answer they gave — directly in Supabase.
 *
 * Two rules shape this module:
 *
 *   1. Writes run as the SIGNED-IN APPLICANT, never with elevated privileges.
 *      Row level security is the authority, so a defect here cannot leak or
 *      corrupt another applicant's record.
 *
 *   2. A mirror failure must never break an applicant's registration. Supabase
 *      holds a second copy; the application database remains the one the
 *      applicant is actually using. Failures are returned so the caller can
 *      record them, and the applicant is never shown a raw provider error.
 *
 * Upserts are deliberately avoided on `trishul_participants` and
 * `trishul_registrations`: an upsert becomes `INSERT ... ON CONFLICT DO UPDATE`
 * over every supplied column, and the applicant is not granted UPDATE on
 * columns such as `email` or `reference`, so an upsert would be rejected. Each
 * write below therefore selects first and then inserts or updates explicitly.
 */

export interface RegistryOutcome {
  ok: boolean
  message?: string
  /** `trishul_participants.id` */
  participantId?: string
  /** `trishul_registrations.id` */
  registrationId?: string
  /** True when the row was created rather than updated. */
  created?: boolean
}

export interface RegistryProfile {
  fullName?: string | null
  country?: string | null
  region?: string | null
  timeZone?: string | null
  institution?: string | null
  participantCategory?: string | null
  ageBand?: string | null
  preferredLanguage?: string | null
  phone?: string | null
  guardianEmail?: string | null
}

function failure(error: { message?: string } | null, context: string): RegistryOutcome {
  const detail = error?.message ?? 'unknown error'
  // Kept on the server: the applicant sees a generic, actionable message.
  console.error(`[registry] ${context}: ${detail}`)
  return { ok: false, message: `Registry ${context} failed: ${detail}` }
}

/** Drops keys whose value is undefined so a write never blanks a real value. */
function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Partial<T> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key as keyof T] = value as T[keyof T]
  }
  return output
}

// ---------------------------------------------------------------------------
// Participant profile
// ---------------------------------------------------------------------------

/**
 * Creates the participant row on first use, or updates the profile fields the
 * applicant is allowed to own. Idempotent: safe to call on every step.
 */
export async function saveRegistryProfile(
  identity: SupabaseIdentity,
  profile: RegistryProfile,
  appParticipantId?: string | null,
): Promise<RegistryOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Registry is not configured.' }

  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const { data: existing, error: readError } = await supabase
    .from('trishul_participants')
    .select('id')
    .eq('auth_user_id', identity.id)
    .maybeSingle()

  if (readError) return failure(readError, 'participant lookup')

  if (existing?.id) {
    // Only the columns granted for UPDATE. `email`, `auth_provider` and
    // `account_status` are intentionally not applicant-writable.
    const patch = compact({
      full_name: profile.fullName ?? undefined,
      country: profile.country ?? undefined,
      region: profile.region ?? undefined,
      time_zone: profile.timeZone ?? undefined,
      institution: profile.institution ?? undefined,
      participant_category: profile.participantCategory ?? undefined,
      age_band: profile.ageBand ?? undefined,
      preferred_language: profile.preferredLanguage ?? undefined,
      phone: profile.phone ?? undefined,
      guardian_email: profile.guardianEmail ?? undefined,
      last_seen_at: new Date().toISOString(),
    })

    const { error } = await supabase.from('trishul_participants').update(patch).eq('id', existing.id)
    if (error) return failure(error, 'participant update')
    return { ok: true, participantId: existing.id, created: false }
  }

  const { data, error } = await supabase
    .from('trishul_participants')
    .insert(
      compact({
        auth_user_id: identity.id,
        app_participant_id: appParticipantId ?? undefined,
        email: identity.email ?? undefined,
        full_name: profile.fullName ?? identity.fullName ?? identity.email ?? 'Applicant',
        auth_provider: identity.provider ?? undefined,
        country: profile.country ?? undefined,
        region: profile.region ?? undefined,
        time_zone: profile.timeZone ?? undefined,
        institution: profile.institution ?? undefined,
        participant_category: profile.participantCategory ?? undefined,
        age_band: profile.ageBand ?? undefined,
        preferred_language: profile.preferredLanguage ?? undefined,
        phone: profile.phone ?? undefined,
        guardian_email: profile.guardianEmail ?? undefined,
        last_seen_at: new Date().toISOString(),
      }),
    )
    .select('id')
    .single()

  if (error) return failure(error, 'participant insert')
  return { ok: true, participantId: data.id, created: true }
}

// ---------------------------------------------------------------------------
// Registration shell
// ---------------------------------------------------------------------------

/**
 * Returns the applicant's live registration, creating the DRAFT if this is
 * their first step. `reference` is the application reference issued by the
 * application database, so both stores quote the same identifier to the
 * applicant.
 */
export async function ensureRegistryRegistration(
  participantId: string,
  appApplicationId: string,
  reference: string,
): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const { data: existing, error: readError } = await supabase
    .from('trishul_registrations')
    .select('id, reference, status')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (readError) return failure(readError, 'registration lookup')

  if (existing?.id) {
    return { ok: true, participantId, registrationId: existing.id, created: false }
  }

  const { data, error } = await supabase
    .from('trishul_registrations')
    .insert({
      participant_id: participantId,
      app_application_id: appApplicationId,
      reference,
      // The insert policy pins this to DRAFT: an applicant cannot open a
      // registration that is already submitted.
      status: 'DRAFT',
    })
    .select('id')
    .single()

  if (error) return failure(error, 'registration insert')
  return { ok: true, participantId, registrationId: data.id, created: true }
}

// ---------------------------------------------------------------------------
// Step 2 — MUN information and committee preferences
// ---------------------------------------------------------------------------

export interface RegistryMun {
  munExperience?: string | null
  experienceDetail?: string | null
  rolePreference?: string | null
  motivation?: string | null
  topicInterest?: string | null
  currentStep?: number
  completedSteps?: string[]
}

export async function saveRegistryMun(registrationId: string, mun: RegistryMun): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const { error } = await supabase
    .from('trishul_registrations')
    .update(
      compact({
        mun_experience: mun.munExperience ?? undefined,
        experience_detail: mun.experienceDetail ?? undefined,
        role_preference: mun.rolePreference ?? undefined,
        motivation: mun.motivation ?? undefined,
        topic_interest: mun.topicInterest ?? undefined,
        current_step: mun.currentStep ?? undefined,
        completed_steps: mun.completedSteps ?? undefined,
      }),
    )
    .eq('id', registrationId)

  if (error) return failure(error, 'MUN information update')
  return { ok: true, registrationId }
}

export interface RegistryPreference {
  /** Committee id in the application database, when available. */
  committeeId?: string | null
  slug?: string | null
  /** Snapshot at the moment of choosing. Null means the name was not published. */
  name?: string | null
  type?: string | null
}

/**
 * Replaces the ranked preferences.
 *
 * Each preference keeps a SNAPSHOT of the committee as it read when it was
 * chosen. A preference is a fact about the application, so a later rename must
 * not rewrite history, and a committee the organizer has not published yet must
 * not block the applicant from recording an interest.
 */
export async function saveRegistryPreferences(
  registrationId: string,
  preferences: (RegistryPreference | null | undefined)[],
): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const { error: clearError } = await supabase
    .from('trishul_registration_preferences')
    .delete()
    .eq('registration_id', registrationId)
  if (clearError) return failure(clearError, 'preference clear')

  const rows = preferences
    .map((preference, index) => ({ preference, rank: index + 1 }))
    .filter((entry): entry is { preference: RegistryPreference; rank: number } => {
      const value = entry.preference
      return Boolean(value && (value.committeeId || value.slug))
    })
    .map(({ preference, rank }) => ({
      registration_id: registrationId,
      committee_id: preference.committeeId ?? null,
      committee_slug: preference.slug ?? null,
      committee_name: preference.name ?? null,
      committee_type: preference.type ?? null,
      rank,
    }))

  if (!rows.length) return { ok: true, registrationId }

  const { error } = await supabase.from('trishul_registration_preferences').insert(rows)
  if (error) return failure(error, 'preference insert')
  return { ok: true, registrationId }
}

// ---------------------------------------------------------------------------
// Step 3 — policies and consent
// ---------------------------------------------------------------------------

export interface RegistryConsent {
  slug: string
  kind: 'required' | 'optional'
  granted: boolean
  version: string | null
}

/**
 * Records the consent bundle. Required acknowledgements and the optional
 * marketing consent are always separate rows, so agreeing to one can never be
 * read as agreeing to the other.
 */
export async function saveRegistryConsents(
  registrationId: string,
  participantId: string,
  consents: RegistryConsent[],
): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const now = new Date().toISOString()
  const rows = consents.map((consent) => ({
    registration_id: registrationId,
    participant_id: participantId,
    policy_slug: consent.slug,
    kind: consent.kind,
    granted: consent.granted,
    version: consent.version,
    granted_at: consent.granted ? now : null,
    revoked_at: consent.granted ? null : now,
  }))

  // `(registration_id, policy_slug)` is unique, and the applicant holds UPDATE
  // on every column here, so an upsert is safe for this table.
  const { error } = await supabase
    .from('trishul_registration_consents')
    .upsert(rows, { onConflict: 'registration_id,policy_slug' })

  if (error) return failure(error, 'consent upsert')
  return { ok: true, registrationId }
}

/** Withdrawing or granting optional marketing consent after submission. */
export async function setRegistryMarketingConsent(
  registrationId: string,
  granted: boolean,
): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('trishul_registration_consents')
    .update({ granted, granted_at: granted ? now : null, revoked_at: granted ? null : now })
    .eq('registration_id', registrationId)
    .eq('policy_slug', 'marketing-updates')

  if (error) return failure(error, 'marketing consent update')
  return { ok: true, registrationId }
}

// ---------------------------------------------------------------------------
// Submission and withdrawal
// ---------------------------------------------------------------------------

export interface SubmissionDetails {
  policyVersion: string | null
  completedSteps: string[]
  confirmedAccuracyAt: string
  formStartedAt?: string | null
  ipHash?: string | null
  userAgent?: string | null
  publicNote?: string | null
}

/**
 * Freezes the registration: the applicant moves it to SUBMITTED and the status
 * history gets its first entry. Both writes run as the applicant, and the
 * database guard independently rejects anything other than a submission or a
 * withdrawal from a participant session.
 */
export async function markRegistrySubmitted(
  registrationId: string,
  participantId: string,
  details: SubmissionDetails,
): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const submittedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('trishul_registrations')
    .update({
      status: 'SUBMITTED',
      submitted_at: submittedAt,
      policy_version: details.policyVersion,
      confirmed_accuracy_at: details.confirmedAccuracyAt,
      completed_steps: details.completedSteps,
      current_step: details.completedSteps.length,
      form_started_at: details.formStartedAt ?? null,
      submission_ip_hash: details.ipHash ?? null,
      submission_user_agent: details.userAgent ?? null,
    })
    .eq('id', registrationId)

  if (updateError) return failure(updateError, 'submission update')

  const { error: eventError } = await supabase.from('trishul_registration_status_events').insert({
    registration_id: registrationId,
    from_status: 'DRAFT',
    to_status: 'SUBMITTED',
    actor_type: 'participant',
    actor_auth_user_id: null,
    public_note:
      details.publicNote ?? 'Application received. The organizing committee will review it.',
  })

  if (eventError) return failure(eventError, 'submission event')

  return { ok: true, participantId, registrationId }
}

export async function withdrawRegistryRegistration(
  registrationId: string,
  fromStatus: string,
): Promise<RegistryOutcome> {
  const supabase = await supabaseServer()
  if (!supabase) return { ok: false, message: 'Registry is not configured.' }

  const { error: updateError } = await supabase
    .from('trishul_registrations')
    .update({ status: 'WITHDRAWN', withdrawn_at: new Date().toISOString() })
    .eq('id', registrationId)

  if (updateError) return failure(updateError, 'withdrawal update')

  const { error: eventError } = await supabase.from('trishul_registration_status_events').insert({
    registration_id: registrationId,
    from_status: fromStatus,
    to_status: 'WITHDRAWN',
    actor_type: 'participant',
    public_note: 'Withdrawn by the applicant.',
  })

  if (eventError) return failure(eventError, 'withdrawal event')

  return { ok: true, registrationId }
}

/**
 * Resolves the registry ids for an identity. Used by the portal so a returning
 * applicant reads the same record the organizer sees.
 */
export async function findRegistryRegistration(
  identity: SupabaseIdentity,
): Promise<{ participantId: string; registrationId: string; reference: string; status: string } | null> {
  const supabase = await supabaseServer()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('trishul_registrations')
    .select('id, reference, status, participant:trishul_participants!inner(id, auth_user_id)')
    .eq('participant.auth_user_id', identity.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const participant = data.participant as unknown as { id: string }
  return {
    participantId: participant.id,
    registrationId: data.id,
    reference: data.reference,
    status: data.status,
  }
}
