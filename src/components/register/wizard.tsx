'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, LinkButton } from '@/components/ui/button'
import { Alert, Card, CardBody, CardHeader, CardTitle, Progress, badgeVariants } from '@/components/ui/primitives'
import { CheckboxField, Field, Input, NativeSelect, RadioGroup, RadioOption, SpamGuardFields, Textarea } from '@/components/ui/form'
import { Tbd } from '@/components/ui/placeholder'
import { useToast } from '@/components/ui/toast'
import { track } from '@/lib/analytics/track'
import {
  saveMunInformation,
  savePersonalInformation,
  savePolicies,
  submitApplication,
} from '@/lib/registration/actions'
import { idleState, type ActionState } from '@/lib/security/validation'

export interface WizardCommittee {
  id: string
  label: string
  status: string
}

export interface WizardConfig {
  estimatedMinutes: number
  requiredItems: string[]
  eligibility: string | null
  ageRequirement: string | null
  munExperiencePolicy: string | null
  nextStep: string | null
  paymentConfigured: boolean
  paymentDetailsLabel: string | null
  supportEmail: string | null
  policyVersion: string
  countries: string[]
  timeZones: string[]
  commonTimeZones: string[]
  guardianConsentRequired: boolean
  preferencesGuaranteed: boolean
  registrationStatus: string
}

const STEP_TITLES = [
  'Registration information',
  'Personal information',
  'MUN information',
  'Policies & consent',
  'Review',
  'Submit',
] as const

export function RegistrationWizard({
  identity,
  committees,
  config,
  ctx,
  initialStep = 0,
  initialValues = {},
  existingReference,
}: {
  /**
   * The verified Supabase identity. Email and password are owned by the
   * authentication provider, so the wizard never asks for them again.
   */
  identity: { email: string | null; fullName: string | null; provider: string | null }
  committees: WizardCommittee[]
  config: WizardConfig
  ctx: {
    categories: { value: string; label: string; description: string }[]
    experiences: { value: string; label: string; description: string }[]
    roles: { value: string; label: string; description: string }[]
  }
  initialStep?: number
  initialValues?: Record<string, string>
  existingReference?: string | null
}) {
  const [step, setStep] = useState(initialStep)
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [state, setState] = useState<ActionState>(idleState)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const registered = useRef(false)

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    // Announce the new step and move reading position to its heading.
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  useEffect(() => {
    if (registered.current || step < 2) return
    registered.current = true
    track('registration_started')
  }, [step])

  const progress = useMemo(() => (step / (STEP_TITLES.length - 1)) * 100, [step])

  function buildFormData(extra?: Record<string, string>) {
    const formData = new FormData()
    for (const [key, value] of Object.entries({ ...values, ...extra })) {
      formData.append(key, value ?? '')
    }
    formData.append('formStartedAt', values.formStartedAt ?? String(Date.now() - 30_000))
    return formData
  }

  function run(
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
    onSuccess: (result: ActionState) => void,
    label: string,
  ) {
    setState(idleState)
    startTransition(async () => {
      const result = await action(idleState, buildFormData())
      setState(result)
      if (result.ok) {
        track('registration_step_completed', { step: step + 1, stepName: STEP_TITLES[step] })
        if (result.message) toast({ title: label, description: result.message, tone: 'success' })
        onSuccess(result)
      } else {
        // Keep the applicant on a supported path rather than a dead end.
        toast({
          title: 'Check the highlighted fields',
          description: result.message ?? 'Some details need attention before we can continue.',
          tone: result.fieldErrors ? 'warning' : 'error',
        })
      }
    })
  }

  const goTo = (next: number) => {
    setState(idleState)
    setStep(next)
  }

  return (
    <div className="space-y-8">
      {/* Progress — visible, announced, and never in the way on small screens */}
      <div className="space-y-4">
        <Progress value={progress} label={`Step ${Math.min(step + 1, STEP_TITLES.length)} of ${STEP_TITLES.length}: ${STEP_TITLES[step]}`} />
        <ol className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-2xs tracking-wider uppercase">
          {STEP_TITLES.map((title, index) => {
            const isCurrent = index === step
            const isDone = index < step
            return (
              <li key={title} className="flex items-center gap-2">
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border text-[10px]',
                    isCurrent && 'border-brand-600 bg-brand-600 text-white',
                    isDone && 'border-success-500 bg-success-50 text-success-700',
                    !isCurrent && !isDone && 'border-ink-300 meta',
                  )}
                >
                  {isDone ? <CircleCheck className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn(isCurrent ? 'text-ink-900' : 'meta')}>{title}</span>
              </li>
            )
          })}
        </ol>
      </div>

      {state.message ? (
        <Alert tone={state.ok ? 'success' : state.fieldErrors ? 'warning' : 'error'} title={state.ok ? 'Saved' : 'Please review'}>
          {state.message}
        </Alert>
      ) : null}

      <h2 ref={headingRef} tabIndex={-1} className="sr-only" aria-live="polite">
        {STEP_TITLES[step]}
      </h2>

      {/* -------------------------------- STEP 0 ------------------------------- */}
      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Before you begin</CardTitle>
            <p className="text-sm text-ink-600">
              This takes about {config.estimatedMinutes} minutes. You can pause at any point — your progress is saved to
              your account, and you can continue from where you stopped.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <dt className="eyebrow meta">Eligibility</dt>
                <dd className="text-sm text-ink-700">
                  {config.eligibility ?? <Tbd label="ELIGIBILITY" />}
                </dd>
              </div>
              <div className="space-y-1.5">
                <dt className="eyebrow meta">Age requirement</dt>
                <dd className="text-sm text-ink-700">
                  {config.ageRequirement ?? <Tbd label="AGE REQUIREMENT" />}
                </dd>
              </div>
              <div className="space-y-1.5">
                <dt className="eyebrow meta">Registration status</dt>
                <dd className="text-sm text-ink-700">
                  {config.registrationStatus === 'TBD' ? <Tbd label="OPEN / CLOSED / FULL" /> : config.registrationStatus}
                </dd>
              </div>
              <div className="space-y-1.5">
                <dt className="eyebrow meta">Payment</dt>
                <dd className="text-sm text-ink-700">
                  {config.paymentConfigured ? 'Payment is configured' : 'Payment is not configured yet — '}
                  {!config.paymentConfigured ? <Tbd label="PAYMENT DETAILS" /> : null}
                </dd>
              </div>
            </dl>

            <div className="space-y-3">
              <p className="eyebrow meta">Information you will be asked for</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {config.requiredItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                    <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Alert tone="neutral" title="Your data, and what we do with it" icon={<Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}>
              Your application is used to process your registration, allocate a committee and contact you about the
              summit. Optional marketing consent is separate and can be withdrawn at any time from your portal. Read the{' '}
              <Link href="/policies/privacy-notice" className="underline underline-offset-2">
                privacy notice
              </Link>
              .
            </Alert>

            {!config.paymentConfigured ? (
              <Alert tone="warning" title="Payment is not part of this step">
                Registration is submitted without payment while payment details are unconfirmed. Accepted participants
                are told how and when to pay once the details are published.
              </Alert>
            ) : null}

            {/* Required by the PRD: repeat applicants are recognised, not blocked */}
            <p className="text-xs meta">
              Already applied?{' '}
              <Link href="/sign-in" className="underline underline-offset-4">
                Sign in to your registration
              </Link>{' '}
              instead — or enter the same email and password and we will continue your existing application.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button type="button" size="lg" onClick={() => goTo(1)}>
                Start application
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <LinkButton href="/delegate-info" variant="secondary" size="lg">
                Read delegate information
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* -------------------------------- STEP 1 ------------------------------- */}
      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <p className="text-sm text-ink-600">
              Create the account you will use to track your application. Your email address is how the organizing
              committee reaches you.
            </p>
          </CardHeader>
          <CardBody>
            <form
              className="relative space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                formData.delete('website')
                formData.set('formStartedAt', values.formStartedAt ?? String(Date.now() - 30_000))
                setState(idleState)
                startTransition(async () => {
                  const result = await savePersonalInformation(idleState, formData)
                  setState(result)
                  if (result.ok) {
                    // Keep the answers the participant actually typed so the final
                    // review screen shows their real input, never placeholders.
                    // The password is deliberately not retained in client state.
                    setValues((current) => ({
                      ...current,
                      fullName: String(formData.get('fullName') ?? ''),
                      country: String(formData.get('country') ?? ''),
                      timeZone: String(formData.get('timeZone') ?? ''),
                      institution: String(formData.get('institution') ?? ''),
                      participantCategory: String(formData.get('participantCategory') ?? ''),
                      ageBand: String(formData.get('ageBand') ?? ''),
                      preferredLanguage: String(formData.get('preferredLanguage') ?? ''),
                      password: '',
                    }))
                    toast({ title: 'Personal information saved', description: result.message, tone: 'success' })
                    goTo(2)
                  } else {
                    toast({
                      title: 'We could not save that yet',
                      description: result.message ?? 'Check the highlighted fields.',
                      tone: 'warning',
                    })
                  }
                })
              }}
            >
              <SpamGuardFields />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required error={state.fieldErrors?.fullName}>
                  <Input
                    name="fullName"
                    autoComplete="name"
                    defaultValue={values.fullName ?? identity.fullName ?? ''}
                    required
                    minLength={2}
                  />
                </Field>
                <div className="space-y-1.5">
                  <p className="eyebrow meta">Signed in as</p>
                  <p className="text-sm font-medium text-ink-800">{identity.email ?? 'Your account'}</p>
                  <p className="text-xs leading-relaxed meta">
                    Credentials are held by our authentication provider
                    {identity.provider && identity.provider !== 'email' ? ` — you signed in with ${identity.provider}.` : '.'}
                  </p>
                </div>
                <Field label="Country or region" required error={state.fieldErrors?.country}>
                  <NativeSelect name="country" defaultValue={values.country ?? ''} required>
                    <option value="">Select country or region</option>
                    {config.countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Time zone" required error={state.fieldErrors?.timeZone} hint="Used only for scheduling clarity.">
                  <NativeSelect name="timeZone" defaultValue={values.timeZone ?? ''} required>
                    <option value="">Select your time zone</option>
                    <optgroup label="Common">
                      {config.commonTimeZones.map((zone) => (
                        <option key={`common-${zone}`} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All time zones">
                      {config.timeZones.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </optgroup>
                  </NativeSelect>
                </Field>
                <Field label="School, university or institution" required error={state.fieldErrors?.institution}>
                  <Input name="institution" defaultValue={values.institution ?? ''} required minLength={2} />
                </Field>
              </div>

              <Field
                label="Age band"
                error={state.fieldErrors?.ageBand}
                hint={
                  <>
                    Optional. Collected only if the organizing committee confirms an age requirement — currently{' '}
                    <Tbd label="AGE REQUIREMENT" />.
                  </>
                }
              >
                <NativeSelect name="ageBand" defaultValue={values.ageBand ?? ''}>
                  <option value="">Prefer not to say</option>
                  <option value="under-14">Under 14</option>
                  <option value="14-15">14–15</option>
                  <option value="16-17">16–17</option>
                  <option value="18-21">18–21</option>
                  <option value="22-plus">22 or older</option>
                </NativeSelect>
              </Field>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink-800">Participant category</legend>
                <RadioGroup name="participantCategory" value={values.participantCategory ?? ''} onValueChange={(value) => setValues((current) => ({ ...current, participantCategory: value }))} className="grid gap-3 sm:grid-cols-2" required>
                  {ctx.categories.map((option) => (
                    <RadioOption key={option.value} value={option.value} label={option.label} description={option.description} />
                  ))}
                </RadioGroup>
                {state.fieldErrors?.participantCategory ? (
                  <p className="text-xs font-medium text-danger-600" role="alert">
                    {state.fieldErrors.participantCategory}
                  </p>
                ) : null}
              </fieldset>

              <div className="flex flex-wrap gap-3 border-t border-ink-200 pt-5">
                <Button type="button" variant="ghost" onClick={() => goTo(0)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button type="submit" loading={pending} loadingLabel="Saving…">
                  Save and continue
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {/* -------------------------------- STEP 2 ------------------------------- */}
      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>MUN information & committee preferences</CardTitle>
            <p className="text-sm text-ink-600">
              Tell us about your experience and rank the committees you would like to join.
            </p>
          </CardHeader>
          <CardBody>
            <form
              className="relative space-y-6"
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                setState(idleState)
                startTransition(async () => {
                  const result = await saveMunInformation(idleState, formData)
                  setState(result)
                  if (result.ok) {
                    setValues((current) => ({
                      ...current,
                      munExperience: String(formData.get('munExperience') ?? ''),
                      experienceDetail: String(formData.get('experienceDetail') ?? ''),
                      rolePreference: String(formData.get('rolePreference') ?? ''),
                      motivation: String(formData.get('motivation') ?? ''),
                      topicInterest: String(formData.get('topicInterest') ?? ''),
                      preference1: String(formData.get('preference1') ?? ''),
                      preference2: String(formData.get('preference2') ?? ''),
                      preference3: String(formData.get('preference3') ?? ''),
                    }))
                    toast({ title: 'MUN information saved', description: result.message, tone: 'success' })
                    goTo(3)
                  } else {
                    toast({
                      title: 'We could not save that yet',
                      description: result.message ?? 'Check the highlighted fields.',
                      tone: 'warning',
                    })
                  }
                })
              }}
            >
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink-800">Previous MUN or debate experience</legend>
                <p className="text-xs meta">
                  {config.munExperiencePolicy ?? 'Experience requirements: [MUN EXPERIENCE POLICY — TBD]'}
                </p>
                <RadioGroup name="munExperience" value={values.munExperience ?? ''} onValueChange={(value) => setValues((current) => ({ ...current, munExperience: value }))} className="grid gap-3 sm:grid-cols-2">
                  {ctx.experiences.map((option) => (
                    <RadioOption key={option.value} value={option.value} label={option.label} description={option.description} />
                  ))}
                </RadioGroup>
                {state.fieldErrors?.munExperience ? (
                  <p className="text-xs font-medium text-danger-600" role="alert">
                    {state.fieldErrors.munExperience}
                  </p>
                ) : null}
              </fieldset>

              <Field label="Experience details" error={state.fieldErrors?.experienceDetail} hint="Optional. Conferences attended, roles held, awards — only if relevant.">
                <Textarea name="experienceDetail" defaultValue={values.experienceDetail ?? ''} rows={3} maxLength={600} />
              </Field>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink-800">Role you are applying for</legend>
                <RadioGroup name="rolePreference" value={values.rolePreference ?? ''} onValueChange={(value) => setValues((current) => ({ ...current, rolePreference: value }))} className="grid gap-3 sm:grid-cols-3">
                  {ctx.roles.map((option) => (
                    <RadioOption key={option.value} value={option.value} label={option.label} description={option.description} />
                  ))}
                </RadioGroup>
              </fieldset>

              <div className="space-y-4 rounded-lg border border-ink-200 bg-paper-sunk/50 p-4">
                <div className="space-y-1">
                  <h3 className="font-display text-lg text-ink-900">Committee preferences</h3>
                  <p className="text-sm text-ink-600">
                    {config.preferencesGuaranteed
                      ? 'The organizing committee has confirmed that preferences are honoured where possible.'
                      : 'Committee preferences are preferences, not guaranteed assignments.'}
                  </p>
                </div>
                {committees.length ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((rank) => (
                      <Field
                        key={rank}
                        label={`Preference ${rank}${rank === 1 ? '' : ''}`}
                        required={rank === 1}
                        error={state.fieldErrors?.[`preference${rank}`]}
                      >
                        <NativeSelect name={`preference${rank}`} defaultValue={values[`preference${rank}`] ?? ''} required={rank === 1}>
                          <option value="">{rank === 1 ? 'Select a committee' : 'No preference'}</option>
                          {committees
                            .filter((committee) => committee.status !== 'closed')
                            .map((committee) => (
                              <option
                                key={committee.id}
                                value={committee.id}
                                disabled={Boolean(
                                  (values.preference1 === committee.id && rank !== 1) ||
                                    (values.preference2 === committee.id && rank !== 2) ||
                                    (values.preference3 === committee.id && rank !== 3),
                                )}
                              >
                                {committee.label}
                                {committee.status === 'waitlist' ? ' — waitlist only' : ''}
                              </option>
                            ))}
                        </NativeSelect>
                      </Field>
                    ))}
                  </div>
                ) : (
                  <Alert tone="warning" title="No committees are published yet">
                    You can still submit your application. The organizing committee will ask you to rank preferences once
                    the committee list is published — nothing is assumed on your behalf.
                  </Alert>
                )}
              </div>

              <Field
                label="Motivation and topic interest"
                error={state.fieldErrors?.motivation}
                hint="Optional. Why this summit, and which topics you would like to debate."
              >
                <Textarea name="motivation" defaultValue={values.motivation ?? ''} rows={4} maxLength={1200} />
              </Field>

              <Field label="Specific topic interest" error={state.fieldErrors?.topicInterest} hint="Optional. One line is plenty.">
                <Input name="topicInterest" defaultValue={values.topicInterest ?? ''} maxLength={300} />
              </Field>

              <div className="flex flex-wrap gap-3 border-t border-ink-200 pt-5">
                <Button type="button" variant="ghost" onClick={() => goTo(1)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button type="submit" loading={pending} loadingLabel="Saving…">
                  Save and continue
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {/* -------------------------------- STEP 3 ------------------------------- */}
      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Policies & consent</CardTitle>
            <p className="text-sm text-ink-600">
              Required acknowledgements and optional communication consent are recorded separately, so saying yes to one
              never means yes to the other.
            </p>
          </CardHeader>
          <CardBody>
            <form
              className="relative space-y-6"
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                setState(idleState)
                startTransition(async () => {
                  const result = await savePolicies(idleState, formData)
                  setState(result)
                  if (result.ok) {
                    setValues((current) => ({
                      ...current,
                      terms: formData.get('terms') === 'on' ? 'on' : '',
                      conduct: formData.get('conduct') === 'on' ? 'on' : '',
                      privacy: formData.get('privacy') === 'on' ? 'on' : '',
                      marketing: formData.get('marketing') === 'on' ? 'on' : '',
                    }))
                    toast({ title: 'Consent recorded', description: result.message, tone: 'success' })
                    goTo(4)
                  } else {
                    toast({
                      title: 'Consent needed to continue',
                      description: result.message ?? 'All three acknowledgements are required.',
                      tone: 'warning',
                    })
                  }
                })
              }}
            >
              <SpamGuardFields />
              <fieldset className="space-y-4">
                <legend className="text-sm font-medium text-ink-800">Required acknowledgements</legend>
                <CheckboxField
                  name="terms"
                  label={
                    <>
                      I accept the{' '}
                      <Link href="/policies/participation-terms" className="underline underline-offset-2">
                        Terms of Participation
                      </Link>
                    </>
                  }
                  description={state.fieldErrors?.terms ? <span className="text-danger-600">{state.fieldErrors.terms}</span> : `Version ${config.policyVersion}`}
                />
                <CheckboxField
                  name="conduct"
                  label={
                    <>
                      I accept the{' '}
                      <Link href="/policies/code-of-conduct" className="underline underline-offset-2">
                        Code of Conduct
                      </Link>
                    </>
                  }
                  description={state.fieldErrors?.conduct ? <span className="text-danger-600">{state.fieldErrors.conduct}</span> : 'Applies in every committee and channel during the summit.'}
                />
                <CheckboxField
                  name="privacy"
                  label={
                    <>
                      I have read the{' '}
                      <Link href="/policies/privacy-notice" className="underline underline-offset-2">
                        Privacy Notice
                      </Link>
                    </>
                  }
                  description={state.fieldErrors?.privacy ? <span className="text-danger-600">{state.fieldErrors.privacy}</span> : 'Explains what we store, for how long, and how to ask for a copy or deletion.'}
                />
              </fieldset>

              <fieldset className="space-y-3 rounded-lg border border-dashed border-ink-300 p-4">
                <legend className="text-sm font-medium text-ink-800">Optional</legend>
                <CheckboxField
                  name="marketing"
                  label="Send me optional updates about future editions and community news"
                  description="Transactional messages about your application are always sent. This consent is optional and can be withdrawn at any time from your portal."
                />
              </fieldset>

              <div className="flex flex-wrap gap-3 border-t border-ink-200 pt-5">
                <Button type="button" variant="ghost" onClick={() => goTo(2)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button type="submit" loading={pending} loadingLabel="Saving…">
                  Save and continue
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {/* -------------------------------- STEP 4 ------------------------------- */}
      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review your application</CardTitle>
            <p className="text-sm text-ink-600">
              Everything below is what the organizing committee will see. Use the edit links to change anything before
              you submit.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <ReviewSection
              title="Personal information"
              onEdit={() => goTo(1)}
              rows={[
                ['Full name', values.fullName],
                ['Email address', identity.email ?? values.email],
                ['Country or region', values.country],
                ['Time zone', values.timeZone],
                ['Institution', values.institution],
                ['Participant category', ctx.categories.find((option) => option.value === values.participantCategory)?.label],
                ['Age band', values.ageBand],
              ]}
            />
            <ReviewSection
              title="MUN information"
              onEdit={() => goTo(2)}
              rows={[
                ['Experience', ctx.experiences.find((option) => option.value === values.munExperience)?.label],
                ['Role applied for', ctx.roles.find((option) => option.value === values.rolePreference)?.label],
                [
                  'Committee preferences',
                  [values.preference1, values.preference2, values.preference3]
                    .filter(Boolean)
                    .map((id) => committees.find((committee) => committee.id === id)?.label ?? 'Committee')
                    .join(' → '),
                ],
                ['Motivation', values.motivation],
                ['Topic interest', values.topicInterest],
              ]}
            />
            <ReviewSection
              title="Policies & consent"
              onEdit={() => goTo(3)}
              rows={[
                ['Terms of Participation', values.terms === 'on' ? `Accepted (v${config.policyVersion})` : 'Not accepted'],
                ['Code of Conduct', values.conduct === 'on' ? 'Accepted' : 'Not accepted'],
                ['Privacy Notice', values.privacy === 'on' ? 'Acknowledged' : 'Not acknowledged'],
                ['Optional updates', values.marketing === 'on' ? 'Opted in' : 'Not opted in'],
              ]}
            />

            <form
              className="relative space-y-5 rounded-lg border border-ink-200 bg-paper-sunk/50 p-4"
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                setState(idleState)
                startTransition(async () => {
                  const result = await submitApplication(idleState, formData)
                  setState(result)
                  if (result.ok) {
                    track('registration_submitted')
                    window.location.assign('/register/submitted')
                  } else {
                    toast({
                      title: 'Not submitted yet',
                      description: result.message ?? 'Something needs attention first.',
                      tone: 'error',
                    })
                  }
                })
              }}
            >
              <SpamGuardFields />
              <CheckboxField
                name="confirmAccuracy"
                label="I confirm the information above is accurate and complete"
                description={
                  state.fieldErrors?.confirmAccuracy ? (
                    <span className="text-danger-600">{state.fieldErrors.confirmAccuracy}</span>
                  ) : (
                    'You can still update editable information from your portal after submitting.'
                  )
                }
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="ghost" onClick={() => goTo(3)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button type="submit" size="lg" loading={pending} loadingLabel="Submitting…">
                  Submit application
                  <Sparkles className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {existingReference ? (
        <p className="text-xs meta">
          Existing application reference: <span className="font-mono">{existingReference}</span>
        </p>
      ) : null}

      <p className="flex items-start gap-2 text-xs leading-relaxed meta">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Your application is transmitted over an encrypted connection and stored with access controls. Reviewer notes are
        internal and never shown to applicants.
      </p>
    </div>
  )
}

function ReviewSection({
  title,
  rows,
  onEdit,
}: {
  title: string
  rows: [string, string | undefined][]
  onEdit: () => void
}) {
  return (
    <section className="space-y-3 rounded-lg border border-ink-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-lg text-ink-900">{title}</h3>
        <Button type="button" variant="link" onClick={onEdit} className="text-sm">
          Edit
        </Button>
      </div>
      <dl className="divide-y divide-ink-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-6">
            <dt className="eyebrow shrink-0 meta sm:w-52">{label}</dt>
            <dd className={cn('text-sm', value ? 'text-ink-800' : 'meta')}>
              {value || (label === 'Age band' ? '—' : <Tbd label={label.toUpperCase()} />)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function RegistrationStatusNotice({ status }: { status: string }) {
  if (status === 'OPEN') {
    return (
      <Alert tone="success" title="Registration is open">
        Applications are being accepted. You can save a draft and return to it at any time before you submit.
      </Alert>
    )
  }
  if (status === 'CLOSED' || status === 'FULL') {
    return (
      <Alert tone="warning" title={status === 'FULL' ? 'Registration is full' : 'Registration is closed'}>
        <p>
          {status === 'FULL'
            ? 'Every published place is currently taken. Applications submitted now are recorded on the waitlist.'
            : 'The organizing committee is not accepting new applications at the moment.'}
        </p>
        <p className="mt-2">
          You can still create an account and review your details, and support can advise on waitlist or future-edition
          options.
        </p>
      </Alert>
    )
  }
  return (
    <Alert tone="info" title="Registration status is being confirmed">
      <p className="flex flex-wrap items-center gap-2">
        <Tbd label="OPEN / CLOSED / FULL" />
        <span>
          The organizing committee has not published whether registration is open. You may prepare an application, and
          nothing is submitted until you confirm it.
        </span>
      </p>
      <p className="mt-2 flex items-center gap-2">
        <Info className="size-3.5" aria-hidden="true" />
        <span className={cn(badgeVariants({ tone: 'outline' }))}>No fake countdowns, no invented deadlines</span>
      </p>
    </Alert>
  )
}
