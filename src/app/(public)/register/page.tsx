import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buildPageMetadata } from '@/lib/seo'
import { getEventConfig } from '@/lib/config'
import { getSupabaseIdentity } from '@/lib/supabase/server'
import { getAuthProviderStatus } from '@/lib/supabase/auth-actions'
import { ensureLinkedParticipant } from '@/lib/supabase/provision'
import { IdentityGate, IdentityNotice } from '@/components/register/identity-gate'
import { listCommittees } from '@/lib/content/queries'
import { prisma } from '@/lib/db/client'
import { providerStatus } from '@/lib/payments'
import { Eyebrow, Section } from '@/components/ui/primitives'
import { PendingContent } from '@/components/ui/placeholder'
import { RegistrationWizard, RegistrationStatusNotice } from '@/components/register/wizard'
import { COUNTRIES, MUN_EXPERIENCE_OPTIONS, PARTICIPANT_CATEGORIES, ROLE_OPTIONS, timeZoneOptions } from '@/lib/data/geo'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Register',
    description:
      'Apply to Trishul Summit: personal information, MUN experience, committee preferences, policy acknowledgements and review.',
    path: '/register',
    // Registration is a private, session-bound journey — never indexed.
    noindex: true,
  })
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ identity?: string }>
}) {
  const [config, identity, providers, committees, params] = await Promise.all([
    getEventConfig(),
    getSupabaseIdentity(),
    getAuthProviderStatus(),
    listCommittees(),
    searchParams,
  ])
  const provider = providerStatus()
  const zones = timeZoneOptions()

  // ---------------------------------------------------------------------
  // The gate. The registry is keyed to a Supabase identity, so nothing
  // below is reachable until one exists.
  // ---------------------------------------------------------------------
  if (!identity) {
    const registrationStatus = config.text('identity.registrationStatusLabel') ?? 'TBD'

    return (
      <Section className="py-12 sm:py-16">
        <div className="shell">
          <div className="mx-auto max-w-3xl space-y-8">
            <header className="space-y-5">
              <Eyebrow>Registration</Eyebrow>
              <h1 className="font-display text-display-sm">Apply to Trishul Summit</h1>
              <p className="text-base leading-relaxed text-ink-600">
                Create your account to begin. Six short steps follow, your progress is saved as you go, and nothing is
                submitted until you confirm it on the review screen.
              </p>
            </header>

            <RegistrationStatusNotice status={registrationStatus} />
            <IdentityNotice reason={params.identity ?? ''} />
            <IdentityGate providers={providers} />
          </div>
        </div>
      </Section>
    )
  }

  // The identity exists: make sure the application record exists and is linked
  // to it, then carry on exactly as before.
  const provisioned = await ensureLinkedParticipant(identity)
  const participant = provisioned.participant

  // An applicant with a submitted application is sent to the portal instead of a
  // second application they cannot submit.
  let draftValues: Record<string, string> = {}
  let initialStep = 0
  let existingReference: string | null = null

  if (participant) {
    const application = await prisma.application.findFirst({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'desc' },
      include: { preferences: { orderBy: { rank: 'asc' } }, participant: true },
    })

    if (application) {
      existingReference = application.reference
      if (application.status !== 'DRAFT') {
        redirect('/portal')
      }

      const consents = await prisma.consent.findMany({ where: { participantId: participant.id } })
      const granted = (slug: string) => consents.some((consent) => consent.policySlug === slug && consent.granted)
      const marketing = consents.find((consent) => consent.policySlug === 'marketing-updates' && consent.granted)

      draftValues = {
        fullName: application.participant.fullName,
        email: application.participant.email,
        country: application.participant.country ?? '',
        timeZone: application.participant.timeZone ?? '',
        institution: application.participant.institution ?? '',
        participantCategory: application.participant.participantCategory ?? '',
        ageBand: application.participant.ageBand ?? '',
        munExperience: application.munExperience ?? '',
        experienceDetail: application.experienceDetail ?? '',
        rolePreference: application.rolePreference ?? '',
        motivation: application.motivation ?? '',
        topicInterest: application.topicInterest ?? '',
        preference1: application.preferences[0]?.committeeId ?? '',
        preference2: application.preferences[1]?.committeeId ?? '',
        preference3: application.preferences[2]?.committeeId ?? '',
        terms: granted('participation-terms') ? 'on' : '',
        conduct: granted('code-of-conduct') ? 'on' : '',
        privacy: granted('privacy-notice') ? 'on' : '',
        marketing: marketing ? 'on' : '',
      }

      // Resume at the first step that still needs input.
      initialStep = application.munExperience ? 3 : 2
      if (!application.participant.country || !application.participant.institution) initialStep = 1
    }
  }

  const registrationStatus = config.text('identity.registrationStatusLabel') ?? 'TBD'

  return (
    <Section className="py-12 sm:py-16">
      <div className="shell">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="space-y-5">
            <Eyebrow>Registration</Eyebrow>
            <h1 className="font-display text-display-sm">Apply to Trishul Summit</h1>
            <p className="text-base leading-relaxed text-ink-600">
              Six short steps. Your progress is saved, your committee preferences are recorded in order, and nothing is
              submitted until you confirm it on the review screen.
            </p>
          </header>

          <RegistrationStatusNotice status={registrationStatus} />

          {!provider.configured ? (
            <PendingContent title="Payment stays outside this flow">
              No payment provider is configured, so registration does not request payment. Accepted participants will be
              told how and when to pay once the organizing committee publishes the details.
            </PendingContent>
          ) : null}

          <RegistrationWizard
            identity={{ email: identity.email, fullName: identity.fullName, provider: identity.provider }}
            committees={committees.map((committee) => ({
              id: committee.id,
              label: committee.name
                ? `${committee.name}${committee.type ? ` · ${committee.type}` : ''}`
                : `Committee ${committee.displayOrder + 1} — name to be confirmed`,
              status: committee.status,
            }))}
            config={{
              estimatedMinutes: config.num('registration.estimatedMinutes') ?? 10,
              requiredItems: config.list('registration.requiredItems'),
              eligibility: config.text('event.eligibility'),
              ageRequirement: config.text('event.ageRequirement'),
              munExperiencePolicy: config.text('event.munExperiencePolicy'),
              nextStep: config.text('event.nextStepAfterSubmission'),
              paymentConfigured: provider.configured,
              paymentDetailsLabel: config.text('fees.paymentMethod'),
              supportEmail: config.text('contact.supportEmail'),
              policyVersion: config.text('legal.policyVersion') ?? '1.0',
              countries: COUNTRIES,
              timeZones: zones.all,
              commonTimeZones: zones.common,
              guardianConsentRequired: config.bool('legal.guardianConsentRequired'),
              preferencesGuaranteed: config.bool('event.preferencesGuaranteed'),
              registrationStatus,
            }}
            ctx={{
              categories: PARTICIPANT_CATEGORIES,
              experiences: MUN_EXPERIENCE_OPTIONS,
              roles: ROLE_OPTIONS,
            }}
            initialStep={initialStep}
            initialValues={draftValues}
            existingReference={existingReference}
          />

          <p className="text-xs leading-relaxed meta">
            By registering you accept the{' '}
            <Link href="/policies/participation-terms" className="underline underline-offset-4">
              Terms of Participation
            </Link>
            , the{' '}
            <Link href="/policies/code-of-conduct" className="underline underline-offset-4">
              Code of Conduct
            </Link>{' '}
            and the{' '}
            <Link href="/policies/privacy-notice" className="underline underline-offset-4">
              Privacy Notice
            </Link>
            .
          </p>
        </div>
      </div>
    </Section>
  )
}
