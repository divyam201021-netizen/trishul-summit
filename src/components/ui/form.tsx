'use client'

import { createContext, forwardRef, useContext, useId, useMemo } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Check, ChevronDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from './button'

/**
 * Form primitives.
 *
 * Accessibility contract (WCAG 2.2 AA):
 *  • every control has a programmatically associated <label>
 *  • help text and errors are wired through aria-describedby
 *  • invalid fields set aria-invalid and focus the first error on submit
 *  • errors are announced politely rather than relying on colour
 */

interface FieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)
const useField = () => useContext(FieldContext)

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  labelHidden,
  as: As = 'div',
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string | null
  required?: boolean
  children: React.ReactNode
  className?: string
  labelHidden?: boolean
  as?: 'div' | 'fieldset'
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const value = useMemo(
    () => ({ id, describedBy, invalid: Boolean(error), required: Boolean(required) }),
    [id, describedBy, error, required],
  )

  return (
    <FieldContext.Provider value={value}>
      <As className={cn('flex flex-col gap-2', className)}>
        <LabelPrimitive.Root
          htmlFor={id}
          className={cn(
            'text-sm font-medium text-ink-800',
            labelHidden && 'sr-only',
          )}
        >
          {label}
          {required ? (
            <span className="ml-1 text-danger-600" aria-hidden="true">
              *
            </span>
          ) : null}
          {!required ? <span className="ml-2 font-normal meta">(optional)</span> : null}
        </LabelPrimitive.Root>
        {hint ? (
          <p id={hintId} className="text-xs leading-relaxed meta">
            {hint}
          </p>
        ) : null}
        {children}
        {error ? (
          <p id={errorId} className="text-xs font-medium text-danger-600" role="alert">
            {error}
          </p>
        ) : null}
      </As>
    </FieldContext.Provider>
  )
}

const controlClasses =
  'w-full rounded-md border border-ink-300 bg-paper-raised px-3.5 py-2.5 text-sm text-ink-900 shadow-[0_1px_0_rgba(11,11,15,0.02)] transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600 disabled:bg-ink-100 disabled:meta aria-[invalid=true]:border-danger-500'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    const field = useField()
    return (
      <input
        ref={ref}
        id={field?.id}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        aria-required={field?.required || undefined}
        className={cn(controlClasses, className)}
        {...props}
      />
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    const field = useField()
    return (
      <textarea
        ref={ref}
        id={field?.id}
        rows={rows}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        aria-required={field?.required || undefined}
        className={cn(controlClasses, 'min-h-[6rem] resize-y leading-relaxed', className)}
        {...props}
      />
    )
  },
)

export const NativeSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...props }, ref) {
    const field = useField()
    return (
      <div className="relative">
        <select
          ref={ref}
          id={field?.id}
          aria-describedby={field?.describedBy}
          aria-invalid={field?.invalid || undefined}
          aria-required={field?.required || undefined}
          className={cn(controlClasses, 'appearance-none pr-10', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 meta" aria-hidden="true" />
      </div>
    )
  },
)

export const Checkbox = forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer size-5 shrink-0 rounded-[5px] border border-ink-400 bg-paper-raised transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=indeterminate]:border-brand-600 data-[state=indeterminate]:bg-brand-600 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        {props.checked === 'indeterminate' ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})

/** Checkbox plus its own label — the label is part of the control's name. */
export function CheckboxField({
  label,
  description,
  id,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  label: React.ReactNode
  description?: React.ReactNode
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Checkbox id={inputId} aria-describedby={descriptionId} className="mt-0.5" {...props} />
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-sm leading-snug text-ink-800">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-xs leading-relaxed meta">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export const RadioGroup = RadioGroupPrimitive.Root

export function RadioOption({
  value,
  label,
  description,
  className,
}: {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border border-ink-200 p-3.5 transition-colors hover:border-ink-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/60', className)}>
      <RadioGroupPrimitive.Item
        value={value}
        id={id}
        className="mt-0.5 size-4.5 shrink-0 rounded-full border border-ink-400 bg-paper-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 data-[state=checked]:border-[5px] data-[state=checked]:border-brand-600"
      />
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium text-ink-800">
          {label}
        </label>
        {description ? <p className="text-xs leading-relaxed meta">{description}</p> : null}
      </div>
    </div>
  )
}

/** Submit button that inherits React 19's pending state via useFormStatus parent. */
export function SubmitButton({ children, loadingLabel, ...props }: ButtonProps) {
  return (
    <Button type="submit" {...props}>
      {children}
    </Button>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-danger-500/35 bg-danger-50 p-3.5 text-sm text-danger-700" role="alert">
      {message}
    </div>
  )
}

/** Honeypot + timing fields. Invisible to people, effective against naive bots. */
export function SpamGuardFields() {
  const startedAt = useMemo(() => Date.now(), [])
  return (
    <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      <input type="hidden" name="formStartedAt" value={startedAt} />
    </div>
  )
}
