/**
 * ============================================================================
 * REGISTRATION STATUS MODEL
 * ============================================================================
 * Exactly one status model is used by the database, the admin workspace and the
 * participant portal. Each status carries:
 *   • label            — how it reads to a participant
 *   • tone             — visual treatment (never colour-only: every badge pairs
 *                        an icon and text with the tone)
 *   • explanation      — what the status means, in plain language
 *   • nextAction       — what the participant should do, if anything
 *
 * Internal review states (notes, reviewer identity, decision metadata) are not
 * part of this model and are never exposed to participants.
 */

export const APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACTION_REQUIRED',
  'ACCEPTED_PAYMENT_PENDING',
  'CONFIRMED',
  'WAITLISTED',
  'DECLINED',
  'WITHDRAWN',
  'CANCELLED',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export type StatusTone = 'neutral' | 'progress' | 'positive' | 'warning' | 'negative'

/** Icon keys resolve to lucide icons in the badge component (keeps this file server-safe). */
export type StatusIconKey =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'action'
  | 'payment'
  | 'confirmed'
  | 'waitlist'
  | 'declined'
  | 'withdrawn'
  | 'cancelled'

export interface StatusMeta {
  status: ApplicationStatus
  label: string
  tone: StatusTone
  icon: StatusIconKey
  explanation: string
  nextAction: string
  /** Whether a participant can still edit their application. */
  editable: boolean
  /** Whether the participant should keep watching their email. */
  awaitingParticipant: boolean
}

export const STATUS_ORDER: readonly ApplicationStatus[] = APPLICATION_STATUSES

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  DRAFT: {
    status: 'DRAFT',
    label: 'Draft',
    tone: 'neutral',
    icon: 'draft',
    explanation: 'Your application has been started but not yet submitted. Only you can see it.',
    nextAction: 'Complete the remaining steps and submit your application.',
    editable: true,
    awaitingParticipant: true,
  },
  SUBMITTED: {
    status: 'SUBMITTED',
    label: 'Submitted',
    tone: 'progress',
    icon: 'submitted',
    explanation: 'We have received your application. It is queued for review by the organizing committee.',
    nextAction: 'Watch your email for confirmation and any requests for further information.',
    editable: false,
    awaitingParticipant: false,
  },
  UNDER_REVIEW: {
    status: 'UNDER_REVIEW',
    label: 'Under review',
    tone: 'progress',
    icon: 'review',
    explanation: 'The organizing committee is reviewing your application and your committee preferences.',
    nextAction: 'No action needed. You will be notified when a decision is recorded.',
    editable: false,
    awaitingParticipant: false,
  },
  ACTION_REQUIRED: {
    status: 'ACTION_REQUIRED',
    label: 'Action required',
    tone: 'warning',
    icon: 'action',
    explanation: 'Something in your application needs your attention before it can be processed.',
    nextAction: 'Read the request in your portal notifications and update your application.',
    editable: true,
    awaitingParticipant: true,
  },
  ACCEPTED_PAYMENT_PENDING: {
    status: 'ACCEPTED_PAYMENT_PENDING',
    label: 'Accepted — payment pending',
    tone: 'warning',
    icon: 'payment',
    explanation: 'Your place has been approved. It is confirmed once the participation fee is settled.',
    nextAction: 'Complete payment when payment details are published, or contact support for alternatives.',
    editable: false,
    awaitingParticipant: true,
  },
  CONFIRMED: {
    status: 'CONFIRMED',
    label: 'Confirmed',
    tone: 'positive',
    icon: 'confirmed',
    explanation: 'Your participation is confirmed. Your committee allocation and joining information are released here.',
    nextAction: 'Prepare for your committee using the preparation information in your portal.',
    editable: false,
    awaitingParticipant: true,
  },
  WAITLISTED: {
    status: 'WAITLISTED',
    label: 'Waitlisted',
    tone: 'warning',
    icon: 'waitlist',
    explanation:
      'Your application met the requirements, but capacity is currently full. Waitlisted applicants are offered places as they become available.',
    nextAction: 'No action needed. Keep an eye on your email for updates.',
    editable: false,
    awaitingParticipant: true,
  },
  DECLINED: {
    status: 'DECLINED',
    label: 'Declined',
    tone: 'negative',
    icon: 'declined',
    explanation: 'The organizing committee is unable to offer you a place for this edition.',
    nextAction: 'Contact support if you believe this decision was made in error or to ask about future editions.',
    editable: false,
    awaitingParticipant: false,
  },
  WITHDRAWN: {
    status: 'WITHDRAWN',
    label: 'Withdrawn',
    tone: 'neutral',
    icon: 'withdrawn',
    explanation: 'This application was withdrawn by the applicant.',
    nextAction: 'Contact support if you would like to be considered again.',
    editable: false,
    awaitingParticipant: false,
  },
  CANCELLED: {
    status: 'CANCELLED',
    label: 'Cancelled / Refunded',
    tone: 'neutral',
    icon: 'cancelled',
    explanation: 'This application was cancelled. Any settled payment is handled under the refund policy.',
    nextAction: 'Contact support with your application reference if you have questions about a refund.',
    editable: false,
    awaitingParticipant: false,
  },
}

export function statusMeta(status: string | null | undefined): StatusMeta {
  const key = (status ?? 'DRAFT').toUpperCase() as ApplicationStatus
  return STATUS_META[key] ?? STATUS_META.DRAFT
}

/** Statuses an organizer is allowed to move an application to. */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'ACTION_REQUIRED', 'ACCEPTED_PAYMENT_PENDING', 'WAITLISTED', 'DECLINED', 'WITHDRAWN'],
  UNDER_REVIEW: ['ACTION_REQUIRED', 'ACCEPTED_PAYMENT_PENDING', 'WAITLISTED', 'DECLINED', 'SUBMITTED'],
  ACTION_REQUIRED: ['UNDER_REVIEW', 'SUBMITTED', 'DECLINED', 'WITHDRAWN'],
  ACCEPTED_PAYMENT_PENDING: ['CONFIRMED', 'DECLINED', 'WITHDRAWN', 'WAITLISTED'],
  CONFIRMED: ['CANCELLED', 'WITHDRAWN'],
  WAITLISTED: ['ACCEPTED_PAYMENT_PENDING', 'CONFIRMED', 'DECLINED', 'WITHDRAWN'],
  DECLINED: ['UNDER_REVIEW', 'WAITLISTED'],
  WITHDRAWN: ['SUBMITTED'],
  CANCELLED: [],
}

export function canTransition(from: string, to: ApplicationStatus): boolean {
  const key = (from ?? 'DRAFT').toUpperCase() as ApplicationStatus
  return (ALLOWED_TRANSITIONS[key] ?? []).includes(to)
}

/** Statuses that represent a live place in the programme. */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACTION_REQUIRED',
  'ACCEPTED_PAYMENT_PENDING',
  'CONFIRMED',
  'WAITLISTED',
]
