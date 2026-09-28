'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleCheck, Info, Lock, Mail, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Alert, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/primitives'
import { Field, Input } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  sendSignInLink,
  signInParticipant,
  signUpParticipant,
  startProviderSignIn,
} from '@/lib/supabase/auth-actions'
import { idleState, type ActionState } from '@/lib/security/validation'

export interface GateProviderStatus {
  email: boolean
  google: boolean
  magicLink: boolean
  autoConfirm: boolean
  configured: boolean
}

type Mode = 'create' | 'sign-in'

/**
 * The gate at the start of registration.
 *
 * Nothing beyond this point is reachable without a Supabase identity, because
 * the registry tables are keyed to it. The panel adapts to what the project
 * actually supports — it only offers Google when Google is enabled, and it
 * warns about the confirmation step before the applicant commits rather than
 * after.
 */
export function IdentityGate({
  providers,
  initialMode = 'create',
}: {
  providers: GateProviderStatus
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [state, setState] = useState<ActionState>(idleState)
  const [pending, startTransition] = useTransition()
  const [linkSent, setLinkSent] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (mode === 'create' && !providers.email) setMode('sign-in')
  }, [mode, providers.email])

  function handleResult(result: ActionState, successTitle: string) {
    setState(result)

    if (!result.ok) {
      toast({
        title: 'We could not sign you in',
        description: result.message ?? 'Check the highlighted fields and try again.',
        tone: result.fieldErrors ? 'warning' : 'error',
      })
      return
    }

    // OAuth is a real navigation, not a state change.
    if (result.data?.redirectTo) {
      window.location.assign(String(result.data.redirectTo))
      return
    }

    // Email confirmation or a magic link: nothing more can happen until the
    // applicant opens their inbox, so say so instead of pretending.
    if (result.data?.awaitingConfirmation || result.data?.awaitingLink) {
      toast({ title: successTitle, description: result.message, tone: 'success' })
      return
    }

    toast({ title: successTitle, description: result.message, tone: 'success' })
    // Re-render on the server so the gate is replaced by the wizard.
    router.refresh()
  }

  function run(
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
    formData: FormData,
    successTitle: string,
  ) {
    setState(idleState)
    startTransition(async () => {
      const result = await action(idleState, formData)
      handleResult(result, successTitle)
    })
  }

  function runProvider(provider: string) {
    setState(idleState)
    startTransition(async () => {
      const result = await startProviderSignIn(provider)
      handleResult(result, 'Redirecting')
    })
  }

  function runLink(formData: FormData) {
    setState(idleState)
    setLinkEmail(String(formData.get('email') ?? ''))
    startTransition(async () => {
      const result = await sendSignInLink(idleState, formData)
      setState(result)
      if (result.ok) {
        setLinkSent(true)
        toast({ title: 'Check your inbox', description: result.message, tone: 'success' })
      } else {
        toast({
          title: 'We could not send that link',
          description: result.message ?? 'Try again in a moment.',
          tone: 'error',
        })
      }
    })
  }

  // ---------------------------------------------------------------------
  // Unavailable: say so plainly rather than showing a form that cannot work
  // ---------------------------------------------------------------------
  if (!providers.configured) {
    return (
      <Alert tone="warning" title="Participant accounts are not available yet">
        The organizing committee is still configuring sign-in. You can read everything about the summit, and the support
        team can take your details in the meantime.
      </Alert>
    )
  }

  if (linkSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <p className="text-sm text-ink-600">
            If an account exists for <span className="font-medium text-ink-800">{linkEmail}</span>, a sign-in link is on
            its way.
          </p>
        </CardHeader>
        <CardBody className="space-y-5">
          <Alert tone="info" title="Open the link on this device" icon={<Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}>
            The link returns you here and continues your application exactly where you left off.
          </Alert>
          <Button type="button" variant="secondary" onClick={() => setLinkSent(false)}>
            Use a different method
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create your account' : 'Sign in to continue'}</CardTitle>
        <p className="text-sm text-ink-600">
          Your account holds your application, your committee preferences and any updates from the organizing committee.
          Nothing is submitted until you review it.
        </p>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Mode switch — a real tablist so it is announced correctly */}
        <div role="tablist" aria-label="Create an account or sign in" className="flex gap-1 rounded-md border border-ink-200 p-1">
          {(
            [
              ['create', 'Create an account'],
              ['sign-in', 'I already applied'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value)
                setState(idleState)
              }}
              className={cn(
                'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
                mode === value ? 'bg-ink-900 text-paper' : 'text-ink-600 hover:bg-paper-sunk',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {state.message ? (
          <Alert tone={state.ok ? 'success' : state.fieldErrors ? 'warning' : 'error'} title={state.ok ? 'Note' : 'Please review'}>
            {state.message}
          </Alert>
        ) : null}

        {providers.google ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={pending}
              onClick={() => runProvider('google')}
            >
              Continue with Google
            </Button>
            <p className="text-center text-xs meta">
              You will be sent to Google, then straight back here to finish your application.
            </p>
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-ink-200" />
              <span className="font-mono text-2xs uppercase tracking-wider meta">or use email</span>
              <span className="h-px flex-1 bg-ink-200" />
            </div>
          </div>
        ) : null}

        {mode === 'create' ? (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              run(signUpParticipant, new FormData(event.currentTarget), 'Account created')
            }}
          >
            <Field label="Full name" required error={state.fieldErrors?.fullName}>
              <Input name="fullName" autoComplete="name" required minLength={2} />
            </Field>
            <Field
              label="Email address"
              required
              error={state.fieldErrors?.email}
              hint="Use an address you check regularly — this is how the organizing committee reaches you."
            >
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field
              label="Password"
              required
              error={state.fieldErrors?.password}
              hint="At least 10 characters, with upper- and lower-case letters and a number."
            >
              <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
            </Field>

            {!providers.autoConfirm ? (
              <Alert tone="info" title="We will ask you to confirm your email">
                After you create the account we send a confirmation link. Open it, then sign in to continue — this keeps
                your application tied to an address only you control.
              </Alert>
            ) : null}

            <Button type="submit" size="lg" loading={pending}>
              Create account and continue
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              run(signInParticipant, new FormData(event.currentTarget), 'Signed in')
            }}
          >
            <Field label="Email address" required error={state.fieldErrors?.email}>
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password" required error={state.fieldErrors?.password}>
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Button type="submit" size="lg" loading={pending}>
              Sign in and continue
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
        )}

        {providers.magicLink ? (
          <details className="rounded-md border border-dashed border-ink-300 p-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-800">
              Prefer a sign-in link instead of a password?
            </summary>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                runLink(new FormData(event.currentTarget))
              }}
            >
              <Field label="Email address" required error={state.fieldErrors?.email}>
                <Input name="email" type="email" autoComplete="email" required />
              </Field>
              <Button type="submit" variant="secondary" loading={pending}>
                Email me a sign-in link
              </Button>
            </form>
          </details>
        ) : null}

        <ul className="space-y-2 border-t border-ink-200 pt-5 text-xs leading-relaxed meta">
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Credentials are held by our authentication provider, not in the summit application.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Your record is readable only by you and the organizing committee.
          </li>
          <li className="flex items-start gap-2">
            <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Returning applicants continue their existing application — no duplicates.
          </li>
        </ul>
      </CardBody>
    </Card>
  )
}

/** Small banner explaining why the gate appeared after a failed callback. */
export function IdentityNotice({ reason }: { reason: string }) {
  if (reason === 'error') {
    return (
      <Alert tone="warning" title="That sign-in link could not be completed">
        <p>
          Confirmation links expire, and they only work once. Create the account again, or request a fresh sign-in link,
          and it will bring you straight back here.
        </p>
      </Alert>
    )
  }
  if (reason === 'unavailable') {
    return (
      <Alert tone="warning" title="Participant accounts are not available yet">
        <p className="flex items-center gap-2">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          The organizing committee is still configuring sign-in.
        </p>
      </Alert>
    )
  }
  return null
}
