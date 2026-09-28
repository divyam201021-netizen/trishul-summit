'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/primitives'
import { Field, FormError, Input } from '@/components/ui/form'
import { idleState, type ActionState } from '@/lib/security/validation'

/**
 * Shared sign-in form for participants and organizers.
 *
 * The server action is the only source of truth: it rate-limits, verifies and
 * reports failures without disclosing whether the email or the password was
 * wrong. The form never caches credentials in client state beyond the current
 * submit, and the MFA field only appears once the server has told us an account
 * has MFA enabled — we do not ask for a code "just in case".
 */
export function SignInForm({
  action,
  kind,
  next,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  kind: 'participant' | 'admin'
  next: string
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const mfaRequired = state.data?.mfaRequired === true
  const isAdmin = kind === 'admin'

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.message && !state.ok ? <FormError message={state.message} /> : null}

      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <Field label="Email address" required error={state.fieldErrors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          autoFocus
          placeholder="name@example.com"
        />
      </Field>

      <Field label="Password" required error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>

      {mfaRequired || state.fieldErrors?.mfaCode ? (
        <Field
          label="Authenticator code"
          required
          error={state.fieldErrors?.mfaCode}
          hint="Six digits from the authenticator app you enrolled for this account."
        >
          <Input
            name="mfaCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className="font-mono tracking-[0.3em]"
          />
        </Field>
      ) : null}

      <Button type="submit" variant={isAdmin ? 'primary' : 'brand'} size="lg" block loading={pending} loadingLabel="Checking…">
        {isAdmin ? (
          <>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Sign in to the workspace
          </>
        ) : (
          <>
            <KeyRound className="size-4" aria-hidden="true" />
            Sign in
          </>
        )}
      </Button>

      {!isAdmin ? (
        <p className="text-center text-sm text-ink-600">
          No account yet? Your registration creates one —{' '}
          <Link href="/register" className="link-underline font-medium text-brand-700">
            start an application
          </Link>
          .
        </p>
      ) : null}
    </form>
  )
}
