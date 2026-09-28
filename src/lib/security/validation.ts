import { z } from 'zod'

/** Removes control characters and normalises whitespace before storage. */
export function sanitizePlainText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return ''
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .email('Enter a valid email address, for example name@example.com.')
  .max(200)

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Enter your full name.')
  .max(120, 'That name is too long.')
  .refine((value) => !/[<>]/.test(value), 'Remove any angle brackets from your name.')

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'That password is too long.')
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value), 'Include both upper- and lower-case letters.')
  .refine((value) => /[0-9]/.test(value), 'Include at least one number.')

export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => sanitizePlainText(value ?? '', max))

export const checkboxTrue = (message: string) =>
  z.union([z.literal('on'), z.literal('true'), z.literal(true)]).transform(() => true).or(z.undefined().transform(() => false)).refine((value) => value === true, message)

export function formDataToObject(formData: FormData): Record<string, string> {
  const output: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') output[key] = value
  }
  return output
}

export interface ActionState {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
  /** Arbitrary safe payload for the UI (never raw database rows). */
  data?: Record<string, string | number | boolean | null>
}

export const idleState: ActionState = { ok: false }

export function zodFieldErrors(error: z.ZodError): { fieldErrors: Record<string, string>; message: string } {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return { fieldErrors, message: 'Please review the highlighted fields.' }
}

/** Normalises a time-zone string against the runtime's IANA database. */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value })
    return true
  } catch {
    return false
  }
}
