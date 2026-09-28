'use client'

import { useEffect, useRef, useState } from 'react'
import { useActionState } from 'react'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Alert } from '@/components/ui/primitives'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { idleState, type ActionState } from '@/lib/security/validation'

/**
 * ============================================================================
 * SERVER-ACTION FORM SHELL
 * ============================================================================
 * Every mutating form on this platform is a progressive-enhancement form: it
 * posts to a server action, works without JavaScript, and — when JavaScript is
 * available — reports pending, success and failure states in place.
 *
 * Two signatures exist in the codebase:
 *   • ActionForm      — `(prev, formData) => Promise<ActionState>` (useActionState)
 *   • PlainActionForm — `(formData) => Promise<ActionState>` for one-shot actions
 *
 * Both announce the outcome in a polite live region AND as a toast, so a screen
 * reader user and a sighted user learn the same thing at the same time. Errors
 * are never colour-only and never replaced by a generic "something went wrong".
 */

type StateAction = (prev: ActionState, formData: FormData) => Promise<ActionState>
type PlainAction = (formData: FormData) => Promise<ActionState>

function useOutcome(state: ActionState, onSuccess?: () => void) {
  const { toast } = useToast()
  const lastMessage = useRef<string | null>(null)

  useEffect(() => {
    const message = state.message ?? null
    if (!message || message === lastMessage.current) return
    lastMessage.current = message
    toast({
      title: state.ok ? 'Done' : 'Not saved',
      description: message,
      tone: state.ok ? 'success' : 'error',
    })
    if (state.ok) onSuccess?.()
  }, [state, toast, onSuccess])
}

function FormShell({
  action,
  state,
  pending,
  children,
  className,
  footer,
  submitLabel,
  submitVariant = 'primary',
  submitSize = 'md',
  submitBlock,
  hiddenSubmit = false,
  formRef,
}: {
  action: (formData: FormData) => void
  state: ActionState
  pending: boolean
  children: React.ReactNode
  className?: string
  footer?: React.ReactNode
  submitLabel?: string
  submitVariant?: ButtonProps['variant']
  submitSize?: ButtonProps['size']
  submitBlock?: boolean
  hiddenSubmit?: boolean
  formRef?: React.Ref<HTMLFormElement>
}) {
  const fieldErrors = Object.entries(state.fieldErrors ?? {}).filter(([, message]) => Boolean(message))

  return (
    <form ref={formRef} action={action} className={cn('space-y-5', className)}>
      {children}

      {!state.ok && state.message ? (
        <Alert tone="error" title="That did not save">
          {state.message}
        </Alert>
      ) : null}

      {fieldErrors.length ? (
        <ul className="space-y-1 rounded-lg border border-danger-500/30 bg-danger-50 p-3.5 text-sm text-danger-700">
          {fieldErrors.map(([field, message]) => (
            <li key={field}>
              <span className="font-medium">{field}:</span> {message}
            </li>
          ))}
        </ul>
      ) : null}

      {state.ok && state.message ? (
        <Alert tone="success" title="Saved">
          {state.message}
        </Alert>
      ) : null}

      {state.data && Object.keys(state.data).length ? (
        <dl className="rounded-lg border border-ink-200 bg-paper-sunk/60 p-3.5 text-xs text-ink-600">
          {Object.entries(state.data).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <dt className="font-mono tracking-wide uppercase">{key}</dt>
              <dd className="break-all">{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {footer ?? (
        submitLabel ? (
          <div className={cn('flex flex-wrap items-center gap-3', hiddenSubmit && 'hidden')}>
            <Button type="submit" variant={submitVariant} size={submitSize} block={submitBlock} loading={pending} loadingLabel="Saving…">
              {submitLabel}
            </Button>
          </div>
        ) : null
      )}
    </form>
  )
}

export function ActionForm({
  action,
  children,
  className,
  footer,
  submitLabel,
  submitVariant,
  submitSize,
  submitBlock,
  resetOnSuccess,
  onSuccess,
  hiddenSubmit,
}: {
  action: StateAction
  children?: React.ReactNode
  className?: string
  footer?: React.ReactNode
  submitLabel?: string
  submitVariant?: ButtonProps['variant']
  submitSize?: ButtonProps['size']
  submitBlock?: boolean
  resetOnSuccess?: boolean
  onSuccess?: () => void
  hiddenSubmit?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const formRef = useRef<HTMLFormElement>(null)
  useOutcome(state, onSuccess)

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset()
  }, [state.ok, resetOnSuccess])

  return (
    <FormShell
      formRef={formRef}
      action={formAction}
      state={state}
      pending={pending}
      className={className}
      footer={footer}
      submitLabel={submitLabel}
      submitVariant={submitVariant}
      submitSize={submitSize}
      submitBlock={submitBlock}
      hiddenSubmit={hiddenSubmit}
    >
      {children}
    </FormShell>
  )
}

export function PlainActionForm({
  action,
  children,
  className,
  footer,
  submitLabel,
  submitVariant,
  submitSize,
  submitBlock,
  resetOnSuccess,
  onSuccess,
}: {
  action: PlainAction
  children?: React.ReactNode
  className?: string
  footer?: React.ReactNode
  submitLabel?: string
  submitVariant?: ButtonProps['variant']
  submitSize?: ButtonProps['size']
  submitBlock?: boolean
  resetOnSuccess?: boolean
  onSuccess?: () => void
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState, formData: FormData) => action(formData),
    idleState,
  )
  const formRef = useRef<HTMLFormElement>(null)
  useOutcome(state, onSuccess)

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset()
  }, [state.ok, resetOnSuccess])

  return (
    <FormShell
      formRef={formRef}
      action={formAction}
      state={state}
      pending={pending}
      className={className}
      footer={footer}
      submitLabel={submitLabel}
      submitVariant={submitVariant}
      submitSize={submitSize}
      submitBlock={submitBlock}
    >
      {children}
    </FormShell>
  )
}

/**
 * Consequential action behind an explicit confirmation dialog. Used for
 * deletes and irreversible changes — never for anything routine, so the
 * confirmation keeps its meaning.
 */
export function ConfirmActionForm({
  action,
  hidden,
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  variant = 'ghost',
  size = 'sm',
  icon,
}: {
  action: PlainAction
  hidden: Record<string, string>
  label: string
  confirmTitle: string
  confirmDescription: string
  confirmLabel: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  icon?: React.ReactNode
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState, formData: FormData) => action(formData),
    idleState,
  )
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const submitted = useRef(false)

  useEffect(() => {
    if (!state.message || !submitted.current) return
    submitted.current = false
    toast({ title: state.ok ? 'Done' : 'Not saved', description: state.message, tone: state.ok ? 'success' : 'error' })
  }, [state, toast])

  return (
    <form action={formAction} className="inline-flex">
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={confirmTitle} description={confirmDescription} size="sm">
          {state.message && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              loading={pending}
              loadingLabel="Working…"
              onClick={() => {
                submitted.current = true
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
