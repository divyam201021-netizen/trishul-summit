/**
 * ============================================================================
 * TRANSACTIONAL EMAIL
 * ============================================================================
 * Templates contain only documented placeholders. A placeholder that cannot be
 * resolved stays visible in the rendered message (never silently replaced with
 * an invented value), and the composer reports how many tokens remain.
 */

export type TemplateVariable =
  | 'PARTICIPANT NAME'
  | 'APPLICATION REFERENCE'
  | 'COMMITTEE NAME'
  | 'EVENT DATE'
  | 'JOINING LINK'
  | 'SUPPORT EMAIL'
  | 'PAYMENT DETAILS'
  | 'TIME ZONE'
  | 'NEXT STEP'
  | 'REGISTRATION DEADLINE'

export interface EmailTemplate {
  key: string
  name: string
  kind: 'transactional' | 'marketing'
  subject: string
  body: string
  /** Statuses this template is relevant to — powers audience suggestions. */
  audience: string
  description: string
}

const SIGN_OFF = `Kind regards,
The Trishul Summit organizing committee
Support: [SUPPORT EMAIL]`

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: 'application_submitted',
    name: 'Application submitted',
    kind: 'transactional',
    audience: 'status:SUBMITTED',
    description: 'Sent automatically when an application is received.',
    subject: 'We received your application — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

Thank you for applying to Trishul Summit. Your application has been received and is queued for review by the organizing committee.

Application reference: [APPLICATION REFERENCE]

Keep this reference safe — you will need it when contacting support. You can also review your application at any time in your participant portal.

Event date: [EVENT DATE]
Time zone: [TIME ZONE]

Next step: [NEXT STEP]

${SIGN_OFF}`,
  },
  {
    key: 'application_under_review',
    name: 'Application under review',
    kind: 'transactional',
    audience: 'status:UNDER_REVIEW',
    description: 'Tells the applicant their application is being assessed.',
    subject: 'Your application is under review — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

Your application is now under review. The committee team is assessing your preferences and experience.

Application reference: [APPLICATION REFERENCE]

No action is needed from you at this stage.

${SIGN_OFF}`,
  },
  {
    key: 'action_required',
    name: 'Action required',
    kind: 'transactional',
    audience: 'status:ACTION_REQUIRED',
    description: 'Requests missing or corrected information.',
    subject: 'Action required on your application — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

We need a little more information before we can process your application.

Application reference: [APPLICATION REFERENCE]

Please sign in to your participant portal to see exactly what is needed and to update your details.

${SIGN_OFF}`,
  },
  {
    key: 'accepted',
    name: 'Accepted',
    kind: 'transactional',
    audience: 'status:ACCEPTED_PAYMENT_PENDING',
    description: 'Confirms a place has been approved.',
    subject: 'Your place at Trishul Summit is approved — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

We are pleased to confirm that your application has been approved.

Application reference: [APPLICATION REFERENCE]

Your place is confirmed once the participation fee is settled. Payment details: [PAYMENT DETAILS]

${SIGN_OFF}`,
  },
  {
    key: 'committee_assigned',
    name: 'Committee assigned',
    kind: 'transactional',
    audience: 'status:CONFIRMED',
    description: 'Releases the committee allocation to the participant.',
    subject: 'Your committee allocation — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

Your committee allocation is now available in your participant portal.

Committee: [COMMITTEE NAME]

Please review the preparation information in your portal before the summit begins.

${SIGN_OFF}`,
  },
  {
    key: 'payment_reminder',
    name: 'Payment reminder',
    kind: 'transactional',
    audience: 'status:ACCEPTED_PAYMENT_PENDING',
    description: 'Reminds accepted participants about the outstanding fee.',
    subject: 'Payment reminder — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

This is a reminder that your participation fee is still pending.

Payment details: [PAYMENT DETAILS]

If you have already paid, please contact [SUPPORT EMAIL] so we can reconcile it manually.

${SIGN_OFF}`,
  },
  {
    key: 'confirmed',
    name: 'Confirmed',
    kind: 'transactional',
    audience: 'status:CONFIRMED',
    description: 'Confirms participation and releases joining details.',
    subject: 'You are confirmed for Trishul Summit — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

Your participation is confirmed.

Event date: [EVENT DATE]
Time zone: [TIME ZONE]
Joining link: [JOINING LINK]

Joining links are personal — please do not share them.

${SIGN_OFF}`,
  },
  {
    key: 'waitlisted',
    name: 'Waitlisted',
    kind: 'transactional',
    audience: 'status:WAITLISTED',
    description: 'Explains the waitlist position.',
    subject: 'You are on the waitlist — [APPLICATION REFERENCE]',
    body: `Dear [PARTICIPANT NAME],

Your application met our requirements, but capacity is currently full. You have been placed on the waitlist.

Application reference: [APPLICATION REFERENCE]

If a place becomes available we will contact you at this email address.

${SIGN_OFF}`,
  },
  {
    key: 'event_reminder',
    name: 'Event reminder',
    kind: 'transactional',
    audience: 'status:CONFIRMED',
    description: 'Pre-event reminder with logistics.',
    subject: 'Trishul Summit begins — [EVENT DATE]',
    body: `Dear [PARTICIPANT NAME],

A reminder that Trishul Summit begins on [EVENT DATE] ([TIME ZONE]).

Joining link: [JOINING LINK]

Please test your connection and platform access beforehand.

${SIGN_OFF}`,
  },
  {
    key: 'schedule_update',
    name: 'Schedule update',
    kind: 'transactional',
    audience: 'all',
    description: 'Announces a programme change.',
    subject: 'Schedule update — Trishul Summit',
    body: `Dear [PARTICIPANT NAME],

There has been a change to the summit schedule.

Event date: [EVENT DATE]
Time zone: [TIME ZONE]

The latest published schedule is always available in your portal.

${SIGN_OFF}`,
  },
  {
    key: 'urgent_announcement',
    name: 'Urgent event announcement',
    kind: 'transactional',
    audience: 'all',
    description: 'Time-critical notice during the event.',
    subject: 'Important: Trishul Summit announcement',
    body: `Dear [PARTICIPANT NAME],

Please read this important announcement before your next session.

Support: [SUPPORT EMAIL]

${SIGN_OFF}`,
  },
]

export const TEMPLATE_BY_KEY: Record<string, EmailTemplate> = Object.fromEntries(
  EMAIL_TEMPLATES.map((template) => [template.key, template]),
)

export const TEMPLATE_TOKENS = [
  'PARTICIPANT NAME',
  'APPLICATION REFERENCE',
  'COMMITTEE NAME',
  'EVENT DATE',
  'JOINING LINK',
  'SUPPORT EMAIL',
  'PAYMENT DETAILS',
  'TIME ZONE',
  'NEXT STEP',
  'REGISTRATION DEADLINE',
] as const

export type TemplateVars = Partial<Record<(typeof TEMPLATE_TOKENS)[number], string | null>>

/**
 * Substitutes known values and leaves unknown tokens intact so nobody ever
 * receives a message containing a fabricated fact.
 */
export function renderTemplate(text: string, vars: TemplateVars): { text: string; unresolved: string[] } {
  const unresolved = new Set<string>()
  const rendered = text.replace(/\[([A-Z][A-Z0-9 /—-]{2,40})\]/g, (match, token: string) => {
    const value = vars[token as (typeof TEMPLATE_TOKENS)[number]]
    if (value && value.trim()) return value.trim()
    unresolved.add(token)
    return match
  })
  return { text: rendered, unresolved: [...unresolved] }
}

export function countUnresolved(text: string, vars: TemplateVars): string[] {
  return renderTemplate(text, vars).unresolved
}
