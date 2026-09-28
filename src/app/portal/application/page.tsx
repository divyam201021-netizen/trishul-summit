import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Lock, ShieldCheck } from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { getParticipantApplication, getParticipantConsents, getParticipantProfile } from '@/lib/applications/queries'
import { getEventConfig } from '@/lib/config'
import { statusMeta } from '@/lib/registration/status'
import { updateAllowedInformation } from '@/lib/registration/actions'
import { formatDateTime } from '@/lib/utils'
import { COUNTRIES, timeZoneOptions } from '@/lib/data/geo'
import {
  Alert,
  Badge,
  Breadcrumbs,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EMPTY_STATE_ICONS,
  KeyValue,
  SectionHeading,
  StatusBadge,
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm } from '@/components/ui/action-form'
import { Tbd } from '@/components/ui/placeholder'
import { LinkButton } from '@/components/ui/button'
import { ApplicationControls } from '@/components/portal/portal-controls'

/**
 * The participant's own record of what they submitted, plus the small set of
 * details they are still allowed to correct. Anything the organizing committee
 * has not released (allocation, reviewer notes, internal reasoning) is absent by
 * construction — this page reads a whitelisted projection.
 */
export default async function PortalApplicationPage() {
  const participant = await requireParticipant('/portal/application')
  const [application, profile, consents, config] = await Promise.all([
    getParticipantApplication(participant.id),
    getParticipantProfile(participant.id),
    getParticipantConsents(participant.id),
    getEventConfig(),
  ])

  if (!application) notFound()

  const meta = statusMeta(application.status)
  const zones = timeZoneOptions()
  const marketing = consents.find((consent) => consent.policySlug === 'marketing-updates' && consent.granted && !consent.revokedAt)
  const timeZoneValue = profile?.timeZone && zones.all.includes(profile.timeZone) ? profile.timeZone : ''
  const guardianRequired = config.bool('legal.guardianConsentRequired')

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Portal', href: '/portal' }, { label: 'My application' }]} />

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={application.status} />
          <span className="font-mono text-2xs tracking-[0.14em] meta uppercase">
            {application.reference}
          </span>
        </div>
        <SectionHeading as="h1" eyebrow="My application" title="What you submitted" description={meta.explanation} />
      </header>

      {meta.editable ? (
        <Alert tone="info" title="This application is still editable">
          You can correct your country, time zone and institution below. Everything else was set during registration —
          contact support if it needs to change.
        </Alert>
      ) : (
        <Alert tone="neutral" title="This application is locked for processing">
          Your answers are frozen while the organizing committee reviews them, so a decision is never made against
          information that changed underneath it. Contact support if something is wrong.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <FileText className="size-4 meta" aria-hidden="true" />
                Your responses
              </CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Applying as">
                  {application.rolePreference ? application.rolePreference.replace(/_/g, ' ') : <Tbd label="ROLE" />}
                </KeyValue>
                <KeyValue label="MUN experience">
                  {application.munExperience ? application.munExperience.replace(/_/g, ' ') : <Tbd label="MUN EXPERIENCE" />}
                </KeyValue>
                <KeyValue label="Experience detail">
                  {application.experienceDetail || <span className="meta">Not provided</span>}
                </KeyValue>
                <KeyValue label="Why you applied">
                  {application.motivation ? (
                    <span className="whitespace-pre-line">{application.motivation}</span>
                  ) : (
                    <span className="meta">Not provided</span>
                  )}
                </KeyValue>
                <KeyValue label="Topics you care about">
                  {application.topicInterest ? (
                    <span className="whitespace-pre-line">{application.topicInterest}</span>
                  ) : (
                    <span className="meta">Not provided</span>
                  )}
                </KeyValue>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Committee preferences, in your order</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {application.preferences.length ? (
                <ol className="space-y-3">
                  {application.preferences.map((preference) => (
                    <li key={preference.rank} className="flex flex-wrap items-center gap-3 border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
                      <span className="font-mono text-xs meta">Preference {preference.rank}</span>
                      <span className="text-sm font-medium text-ink-900">
                        {preference.committeeName ?? 'Name to be confirmed'}
                      </span>
                      {preference.status === 'waitlist' ? <Badge tone="warning">Waitlist only</Badge> : null}
                      {preference.status === 'closed' ? <Badge tone="neutral">Closed</Badge> : null}
                      <Link
                        href={`/committees/${preference.committeeSlug}`}
                        className="link-underline ml-auto text-xs text-brand-700"
                      >
                        View committee
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-600">
                  No committee preferences were recorded. The organizing committee will contact you if a preference is
                  required before allocation.
                </p>
              )}
              <p className="text-xs leading-relaxed meta">
                {config.bool('event.preferencesGuaranteed')
                  ? 'The organizing committee has confirmed that preferences are honoured where possible.'
                  : 'Preferences are recorded in order but are not guarantees of allocation.'}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Correct the details we can still change</CardTitle>
            </CardHeader>
            <CardBody>
              {meta.editable ? (
                <ActionForm
                  action={updateAllowedInformation}
                  submitLabel="Save changes"
                  submitVariant="brand"
                >
                  <Field label="Country or region" required>
                    <NativeSelect name="country" defaultValue={profile?.country ?? ''} required>
                      <option value="">Select a country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field
                    label="Time zone"
                    required
                    hint="Used for scheduling, reminders and every time we show you. Choose where you will be during the summit."
                  >
                    <NativeSelect name="timeZone" defaultValue={timeZoneValue} required>
                      <option value="">Select a time zone</option>
                      <optgroup label="Common">
                        {zones.common.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="All time zones">
                        {zones.all
                          .filter((zone) => !zones.common.includes(zone))
                          .map((zone) => (
                            <option key={zone} value={zone}>
                              {zone}
                            </option>
                          ))}
                      </optgroup>
                    </NativeSelect>
                  </Field>

                  <Field label="School, university or institution" required>
                    <Input name="institution" defaultValue={profile?.institution ?? ''} required maxLength={160} />
                  </Field>

                  <Field label="Preferred working language" hint="Optional. Tell us if you would work best in a particular language.">
                    <Input
                      name="preferredLanguage"
                      defaultValue={profile?.preferredLanguage ?? ''}
                      maxLength={60}
                      placeholder="e.g. English"
                    />
                  </Field>
                </ActionForm>
              ) : (
                <dl>
                  <KeyValue label="Country or region">
                    {(profile?.country ?? profile?.region) ?? <Tbd label="COUNTRY / REGION" />}
                  </KeyValue>
                  <KeyValue label="Time zone">{profile?.timeZone ?? <Tbd label="TIME ZONE" />}</KeyValue>
                  <KeyValue label="Institution">{profile?.institution ?? <Tbd label="INSTITUTION" />}</KeyValue>
                  <KeyValue label="Preferred language">
                    {profile?.preferredLanguage ?? <span className="meta">Not provided</span>}
                  </KeyValue>
                </dl>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <ShieldCheck className="size-4 meta" aria-hidden="true" />
                Consent record
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-600">
                Every consent is stored separately with a version and a timestamp. Required consents are part of
                participating; optional consent can be withdrawn here at any time.
              </p>
              {consents.length ? (
                <ul className="space-y-3">
                  {consents.map((consent) => (
                    <li key={`${consent.policySlug}-${consent.kind}`} className="border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/policies/${consent.policySlug}`} className="link-underline text-sm text-ink-800">
                          {consent.policySlug.replace(/-/g, ' ')}
                        </Link>
                        <Badge tone={consent.granted && !consent.revokedAt ? 'positive' : 'neutral'}>
                          {consent.granted && !consent.revokedAt ? 'Granted' : 'Withdrawn'}
                        </Badge>
                        <span className="font-mono text-2xs meta uppercase">
                          {consent.kind === 'optional' ? 'optional' : 'required'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs meta">
                        {consent.grantedAt ? `Granted ${formatDateTime(consent.grantedAt, profile?.timeZone ?? undefined)}` : 'Not granted'}
                        {consent.revokedAt ? ` · withdrawn ${formatDateTime(consent.revokedAt, profile?.timeZone ?? undefined)}` : ''}
                        {consent.version ? ` · version ${consent.version}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<EMPTY_STATE_ICONS.noResults className="size-5" aria-hidden="true" />}
                  title="No consent records yet"
                  description="Consents are recorded when you submit your application."
                />
              )}
              {guardianRequired && !consents.some((consent) => consent.policySlug === 'guardian-consent' && consent.granted) ? (
                <Alert tone="warning" title="Guardian consent required">
                  The organizing committee requires guardian consent for participants under the age threshold.{' '}
                  <Link href="/portal/support" className="underline underline-offset-2">
                    Contact support
                  </Link>{' '}
                  and we will send the form.
                </Alert>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Lock className="size-4 meta" aria-hidden="true" />
                Privacy
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>
                Your application reference is visible only to you and the organizing committee. It never appears in a URL,
                in analytics, or on a public page.
              </p>
              <p>
                Reviewer notes are internal by design: you see status changes and explanations, never internal discussion.
              </p>
              <LinkButton href="/policies/privacy-notice" variant="secondary" size="sm">
                Read the Privacy Notice
              </LinkButton>
            </CardBody>
          </Card>

          <ApplicationControls
            canWithdraw={!['WITHDRAWN', 'CANCELLED', 'DECLINED', 'CONFIRMED'].includes(application.status)}
            marketingConsent={Boolean(marketing)}
          />
        </div>
      </div>
    </div>
  )
}
