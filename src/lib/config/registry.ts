/**
 * ============================================================================
 * TRISHUL SUMMIT — CENTRAL CONTENT & CONFIGURATION REGISTRY
 * ============================================================================
 * This file is the single source of truth for every event-specific fact.
 *
 * Rules encoded here:
 *  1. A field with a `ph` (placeholder label) has NO default value. Until the
 *     organizer supplies it, the UI renders `[LABEL — TBD]` — never a guess.
 *  2. A field without `ph` always has a real, approved value (e.g. the event
 *     name and the online format, which the PRD states explicitly).
 *  3. Admin edits are stored as overrides in the `site_settings` table, so
 *     replacing a TBD value never requires touching a component.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'longtext'
  | 'date'
  | 'time'
  | 'email'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'list'

export type ConfigValue = string | number | boolean | string[] | null

export interface ConfigField {
  /** Dotted path used by `config.value(path)` and the settings table. */
  path: string
  label: string
  type: FieldType
  /** Placeholder label, e.g. "EVENT DATE" renders as `[EVENT DATE — TBD]`. */
  ph?: string
  help?: string
  options?: string[]
  /** Approved default. Only present when the PRD supplies the information. */
  default?: ConfigValue
}

export interface ConfigGroup {
  key: string
  title: string
  description: string
  fields: ConfigField[]
}

const f = (
  path: string,
  label: string,
  type: FieldType,
  extra: Partial<Omit<ConfigField, 'path' | 'label' | 'type'>> = {},
): ConfigField => ({ path, label, type, ...extra })

export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    key: 'identity',
    title: 'Identity & brand',
    description: 'Wordmark, tagline, organizer and brand colour used across the platform.',
    fields: [
      f('identity.name', 'Event name', 'text', { default: 'Trishul Summit' }),
      f('identity.wordmark', 'Wordmark text', 'text', { default: 'TRISHUL SUMMIT' }),
      f('identity.tagline', 'Event tagline', 'text', { ph: 'EVENT TAGLINE' }),
      f('identity.shortDescription', 'Short approved description', 'textarea', {
        ph: 'SHORT APPROVED DESCRIPTION',
        help: 'Used in the footer, social previews and committee/meta descriptions.',
      }),
      f('identity.longDescription', 'Full event description', 'longtext', { ph: 'EVENT DESCRIPTION' }),
      f('identity.organizer', 'Organizer / institution', 'text', { ph: 'ORGANIZER / INSTITUTION' }),
      f('identity.logoUrl', 'Official logo', 'url', {
        ph: 'OFFICIAL LOGO',
        help: 'The wordmark is used until an official logo file is supplied.',
      }),
      f('identity.heroImageUrl', 'Hero imagery', 'url', { ph: 'HERO IMAGERY' }),
      f('identity.brandColor', 'Primary brand colour', 'color', {
        ph: 'PRIMARY BRAND COLOR',
        help: 'Hex value (e.g. #3746A6). Applied to brand tokens at runtime.',
      }),
      f('identity.registrationStatusLabel', 'Registration status', 'select', {
        ph: 'OPEN / CLOSED / FULL',
        options: ['TBD', 'OPEN', 'CLOSED', 'FULL', 'WAITLIST'],
        default: 'TBD',
      }),
    ],
  },
  {
    key: 'event',
    title: 'Dates, format & eligibility',
    description: 'When the summit happens, who may attend and how the programme runs.',
    fields: [
      f('event.format', 'Format', 'text', { default: 'Online Summit' }),
      f('event.dateSummary', 'Date summary', 'text', {
        ph: 'EVENT DATE',
        help: 'Free-text summary shown in the hero and "At a glance" (e.g. "3–5 April 2026").',
      }),
      f('event.startDate', 'Start date', 'date', { ph: 'EVENT DATE' }),
      f('event.endDate', 'End date', 'date', { ph: 'EVENT DATE' }),
      f('event.timeZone', 'Time zone', 'text', {
        ph: 'TIME ZONE',
        help: 'Canonical event time zone. Session times are never shown without it.',
      }),
      f('event.languages', 'Language(s)', 'list', { ph: 'LANGUAGE(S)' }),
      f('event.eligibility', 'Eligibility', 'textarea', { ph: 'ELIGIBILITY' }),
      f('event.ageRequirement', 'Age requirement', 'text', { ph: 'AGE REQUIREMENT' }),
      f('event.munExperiencePolicy', 'MUN experience policy', 'textarea', { ph: 'MUN EXPERIENCE POLICY' }),
      f('event.participantCategories', 'Participant categories', 'list', {
        ph: 'PARTICIPANT CATEGORIES',
        default: ['School student', 'University student', 'Independent / other'],
      }),
      f('event.capacity', 'Total capacity', 'number', { ph: 'CAPACITY' }),
      f('event.allocationProcess', 'Allocation process', 'longtext', { ph: 'ALLOCATION PROCESS' }),
      f('event.nextStepAfterSubmission', 'Next step after submission', 'textarea', { ph: 'NEXT STEP' }),
      f('event.preferencesGuaranteed', 'Committee preferences are guaranteed', 'boolean', {
        default: false,
        help: 'Leave off unless the organizer explicitly confirms guaranteed selection.',
      }),
    ],
  },
  {
    key: 'registration',
    title: 'Registration window',
    description: 'Opening, closing and deadline information for applications.',
    fields: [
      f('registration.opensAt', 'Registration opens', 'date', { ph: 'REGISTRATION OPENING DATE' }),
      f('registration.closesAt', 'Registration closes', 'date', { ph: 'REGISTRATION CLOSING DATE' }),
      f('registration.deadline', 'Registration deadline', 'text', { ph: 'REGISTRATION DEADLINE' }),
      f('registration.estimatedMinutes', 'Estimated completion time (minutes)', 'number', {
        default: 10,
      }),
      f('registration.requiredItems', 'Information you will be asked for', 'list', {
        default: [
          'Full name',
          'Email address',
          'Country or region',
          'Time zone',
          'School, university or institution',
          'Participant category',
          'MUN experience',
          'Committee preferences',
        ],
      }),
      f('registration.confirmationEmailNote', 'Confirmation email note', 'text', {
        default: 'Check your email for confirmation.',
      }),
    ],
  },
  {
    key: 'fees',
    title: 'Fees & payment',
    description: 'Fees, currency, refunds and payment responsibilities. Leave empty until confirmed.',
    fields: [
      f('fees.registrationFee', 'Registration fee', 'text', { ph: 'REGISTRATION FEE' }),
      f('fees.currency', 'Currency', 'text', { ph: 'CURRENCY' }),
      f('fees.refundPolicy', 'Refund policy', 'textarea', { ph: 'REFUND POLICY' }),
      f('fees.paymentMethod', 'Payment method', 'textarea', { ph: 'PAYMENT METHOD' }),
      f('fees.waiverInformation', 'Waiver information', 'textarea', { ph: 'WAIVER INFORMATION' }),
      f('fees.delegateFeeIncludes', 'What the fee includes', 'list', {
        ph: 'FEE INCLUDES',
      }),
    ],
  },
  {
    key: 'platform',
    title: 'Online platform & preparation',
    description: 'Where the summit runs and what participants need to take part.',
    fields: [
      f('platform.name', 'Platform', 'text', { ph: 'ONLINE PLATFORM' }),
      f('platform.joinUrl', 'Joining link', 'url', {
        ph: 'JOINING LINK',
        help: 'Only released to confirmed participants. Never shown on public pages.',
      }),
      f('platform.technicalRequirements', 'Technical requirements', 'longtext', {
        ph: 'TECHNICAL REQUIREMENTS',
      }),
      f('platform.joiningInstructions', 'Joining instructions', 'longtext', {
        ph: 'JOINING INSTRUCTIONS',
      }),
      f('platform.recordingPolicy', 'Recording policy', 'textarea', { ph: 'RECORDING POLICY' }),
    ],
  },
  {
    key: 'content',
    title: 'Editorial content',
    description: 'Approved narrative copy. Each block renders as a placeholder until supplied.',
    fields: [
      f('content.differentiator', 'Key differentiator', 'longtext', { ph: 'KEY DIFFERENTIATOR' }),
      f('content.learningOutcome', 'Learning outcome', 'longtext', { ph: 'LEARNING OUTCOME' }),
      f('content.participantExperience', 'Participant experience', 'longtext', {
        ph: 'PARTICIPANT EXPERIENCE',
      }),
      f('content.leadershipOutcome', 'Leadership / diplomacy outcome', 'longtext', {
        ph: 'LEADERSHIP / DIPLOMACY OUTCOME',
      }),
      f('content.finalCtaCopy', 'Final call-to-action copy', 'textarea', { ph: 'FINAL CTA COPY' }),
      f('content.mission', 'Mission', 'longtext', { ph: 'MISSION STATEMENT' }),
      f('content.whoItsFor', 'Who it is for', 'longtext', { ph: 'AUDIENCE DESCRIPTION' }),
      f('content.whatToExpect', 'What participants can expect', 'longtext', {
        ph: 'PARTICIPANT EXPECTATIONS',
      }),
      f('content.onlineExperience', 'Online experience', 'longtext', { ph: 'ONLINE EXPERIENCE' }),
      f('content.whyParticipate', 'Why participate', 'longtext', { ph: 'WHY PARTICIPATE' }),
      f('content.aboutIntro', 'About page introduction', 'longtext', { ph: 'ABOUT INTRODUCTION' }),
    ],
  },
  {
    key: 'contact',
    title: 'Contact & social',
    description: 'Support routes and official social profiles.',
    fields: [
      f('contact.supportEmail', 'Support email', 'email', { ph: 'SUPPORT EMAIL' }),
      f('contact.supportChannel', 'Support channel', 'text', { ph: 'SUPPORT CHANNEL' }),
      f('contact.supportResponseTime', 'Support response time', 'text', { ph: 'SUPPORT RESPONSE TIME' }),
      f('contact.instagram', 'Instagram', 'url', { ph: 'INSTAGRAM' }),
      f('contact.linkedin', 'LinkedIn', 'url', { ph: 'LINKEDIN' }),
      f('contact.otherSocial', 'Other social profile', 'url', { ph: 'OTHER SOCIAL' }),
      f('contact.pressEmail', 'Press / partnership email', 'email', { ph: 'PARTNERSHIP EMAIL' }),
    ],
  },
  {
    key: 'announcement',
    title: 'Site announcement',
    description: 'Optional banner for organizer-approved notices only.',
    fields: [
      f('announcement.enabled', 'Show announcement banner', 'boolean', { default: false }),
      f('announcement.message', 'Announcement message', 'textarea', { ph: 'ANNOUNCEMENT' }),
      f('announcement.severity', 'Severity', 'select', {
        options: ['info', 'important', 'critical'],
        default: 'info',
      }),
      f('announcement.href', 'Announcement link', 'url', { ph: 'ANNOUNCEMENT LINK' }),
    ],
  },
  {
    key: 'seo',
    title: 'SEO & social previews',
    description: 'Titles, descriptions and preview imagery for public pages.',
    fields: [
      f('seo.titleSuffix', 'Title suffix', 'text', { default: 'Trishul Summit' }),
      f('seo.defaultDescription', 'Default meta description', 'textarea', {
        ph: 'META DESCRIPTION',
      }),
      f('seo.ogImageUrl', 'Social preview image', 'url', { ph: 'SOCIAL PREVIEW IMAGE' }),
      f('seo.canonicalBaseUrl', 'Canonical base URL', 'url', {
        default: 'http://localhost:3000',
        help: 'Set to the live origin before launch (or set APP_URL in the environment).',
      }),
    ],
  },
  {
    key: 'legal',
    title: 'Legal & participation',
    description: 'Policy versions and consent copy shown during registration.',
    fields: [
      f('legal.policyVersion', 'Policy bundle version', 'text', { default: '1.0' }),
      f('legal.guardianConsentRequired', 'Guardian consent required', 'boolean', { default: false }),
      f('legal.privacyContact', 'Privacy contact', 'email', { ph: 'PRIVACY CONTACT' }),
      f('legal.termsNote', 'Terms note', 'textarea', { ph: 'TERMS NOTE' }),
    ],
  },
]

export const CONFIG_FIELDS: ConfigField[] = CONFIG_GROUPS.flatMap((group) => group.fields)

export const CONFIG_FIELD_BY_PATH: Record<string, ConfigField> = Object.fromEntries(
  CONFIG_FIELDS.map((field) => [field.path, field]),
)

export function fieldLabel(path: string): string {
  return CONFIG_FIELD_BY_PATH[path]?.label ?? path
}

/** `[EVENT DATE — TBD]` — the canonical placeholder string. */
export function placeholderText(path: string): string {
  const field = CONFIG_FIELD_BY_PATH[path]
  const label = field?.ph ?? field?.label ?? path
  return `[${label} — TBD]`
}

export const LOGO_PLACEHOLDER = '[OFFICIAL LOGO — PLACEHOLDER]'
export const PAYMENT_PLACEHOLDER = '[PAYMENT DETAILS — TBD]'
export const BRAND_COLOR_PLACEHOLDER = '[PRIMARY BRAND COLOR — TBD]'

/** Fields rendered on public pages. Sensitive/inbound-only values are excluded. */
export const PRIVATE_PATHS = new Set(['platform.joinUrl', 'contact.pressEmail'])
