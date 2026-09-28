'use client'

import { useState, useTransition } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/primitives'
import { Field, Input } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { generateTotpForSelf, verifySelfTotp } from '@/lib/admin/actions'

/**
 * Self-service TOTP enrolment.
 *
 * The secret is only persisted once a valid six-digit code proves the
 * authenticator app is actually paired — so a half-finished enrolment can never
 * lock an organizer out of their own account. The secret is never returned again
 * after this flow, and never rendered anywhere else.
 */
export function MfaEnrolment({ enabled }: { enabled: boolean }) {
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [busy, startTransition] = useTransition()
  const { toast } = useToast()

  function begin() {
    startTransition(async () => {
      const response = await generateTotpForSelf()
      if ('error' in response) {
        toast({ title: 'Could not start enrolment', description: response.error, tone: 'error' })
        return
      }
      setSecret(response.secret)
      setResult(null)
    })
  }

  function confirm() {
    startTransition(async () => {
      const outcome = await verifySelfTotp(code)
      setResult(outcome)
      if (outcome.ok) {
        setSecret(null)
        setCode('')
      }
      toast({
        title: outcome.ok ? 'Multi-factor authentication enabled' : 'Code not accepted',
        description: outcome.message,
        tone: outcome.ok ? 'success' : 'error',
      })
    })
  }

  if (enabled) {
    return (
      <Alert tone="success" title="Multi-factor authentication is enabled">
        Your account requires a current authenticator code at every sign-in. If you lose access to the app, a director can
        disable MFA from the staff screen — that action is recorded in the audit log.
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Alert tone="warning" title="Your organizer account is protected by a password only">
        This workspace holds applicant personal data. Adding an authenticator app takes about a minute and makes account
        takeover dramatically harder.
      </Alert>

      {secret ? (
        <div className="space-y-4 rounded-lg border border-ink-200 bg-paper-sunk/60 p-4">
          <div className="space-y-1">
            <p className="eyebrow meta">Step 1 — add this key to your authenticator app</p>
            <p className="font-mono text-sm break-all text-ink-900">{secret}</p>
            <p className="text-xs leading-relaxed meta">
              Enter it manually in Google Authenticator, 1Password, Authy or any TOTP app. The secret is shown once and is
              never sent by email.
            </p>
          </div>

          <Field label="Step 2 — enter the current six-digit code" required hint="This proves the pairing before the secret is saved.">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="font-mono tracking-[0.3em]"
            />
          </Field>

          {result && !result.ok ? <Alert tone="error">{result.message}</Alert> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="brand" size="sm" onClick={confirm} disabled={code.length !== 6} loading={busy} loadingLabel="Verifying…">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Enable MFA
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSecret(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="brand" size="sm" onClick={begin} loading={busy} loadingLabel="Generating…">
          <KeyRound className="size-3.5" aria-hidden="true" />
          Start MFA enrolment
        </Button>
      )}
    </div>
  )
}
