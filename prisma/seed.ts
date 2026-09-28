/**
 * ============================================================================
 * TRISHUL SUMMIT — DATABASE SEED
 * ============================================================================
 * What this seed deliberately does NOT do:
 *   • It never writes an event fact. No dates, no fees, no venue, no capacity,
 *     no chair names, no sponsor or partner records.
 *   • Every unknown value stays absent, so the public site renders the matching
 *     `[LABEL — TBD]` placeholder. §24 of the PRD: unknown means unknown, visible.
 *
 * What it does create:
 *   • The built-in organizer role presets (RBAC vocabulary).
 *   • One organizer account, only when SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD
 *     are supplied in the environment. No default password is ever shipped.
 *   • Placeholder committee rows (name/type/topic/capacity null), so the
 *     committee directory, registration preferences and allocation tooling are
 *     exercised end to end while staying honest about being placeholders.
 *   • The policy records the registration journey requires, unpublished and
 *     without a body until Legal supplies approved text.
 *   • The twelve FAQ questions from PRD §9. Every answer is null on purpose:
 *     the FAQ page renders `[ANSWER — TBD]` rather than an invented answer.
 *
 * Idempotent: safe to run repeatedly (`npm run db:seed`).
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword, passwordIssues } from '../src/lib/auth/crypto'
import { ensureRolePresets } from '../src/lib/auth/roles'

const prisma = new PrismaClient()

const PLACEHOLDER_COMMITTEE_COUNT = 3

/** Policies the registration journey references by slug. Bodies stay empty. */
const POLICIES = [
  {
    slug: 'privacy-notice',
    title: 'Privacy Notice',
    summary: 'What personal data the organizing committee collects, why, and for how long it is kept.',
    version: '1.0',
  },
  {
    slug: 'participation-terms',
    title: 'Terms of Participation',
    summary: 'The conditions a participant accepts when registering for Trishul Summit.',
    version: '1.0',
  },
  {
    slug: 'code-of-conduct',
    title: 'Code of Conduct',
    summary: 'The behaviour expected of every participant, delegate and organizer in summit spaces.',
    version: '1.0',
  },
  {
    slug: 'cancellation-refund-policy',
    title: 'Cancellation / Refund Policy',
    summary: 'How cancellations and refunds are handled once participation fees are published.',
    version: '1.0',
  },
  {
    // Referenced by the optional marketing consent and by the
    // `marketing_optin` communication audience. Never added to public nav.
    slug: 'marketing-updates',
    title: 'Marketing & Updates Consent',
    summary: 'Optional consent to receive non-transactional news about Trishul Summit.',
    version: '1.0',
  },
] as const

/**
 * PRD §9 question set. Wording follows the topic list in the PRD; every answer
 * is intentionally null so the UI shows `[ANSWER — TBD]`. Answers, categories
 * and wording are all editable from /admin/content.
 */
const FAQ: { question: string; category: string }[] = [
  { question: 'What is Trishul Summit?', category: 'The summit' },
  { question: 'Who can participate?', category: 'Eligibility' },
  { question: 'Is prior Model UN experience required?', category: 'Eligibility' },
  { question: 'When is the summit?', category: 'Dates' },
  { question: 'How does online participation work?', category: 'Participation' },
  { question: 'What do I need in order to take part?', category: 'Participation' },
  { question: 'How does registration work?', category: 'Registration' },
  { question: 'What happens after I submit my application?', category: 'Registration' },
  { question: 'How are committees allocated?', category: 'Committees' },
  { question: 'What does it cost to participate?', category: 'Fees' },
  { question: 'What is expected of participants?', category: 'Conduct' },
  { question: 'Who do I contact if I have a question?', category: 'Support' },
]

async function main() {
  const notes: string[] = []

  /* --- Organizer roles ---------------------------------------------------- */
  await ensureRolePresets()
  notes.push('Role presets ensured (director, organizer, registrar, reviewer, finance, communications).')

  /* --- Organizer account (credential-gated, never defaulted) -------------- */
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase()
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? ''
  const adminName = (process.env.SEED_ADMIN_NAME ?? '').trim()

  if (adminEmail && adminPassword) {
    const issues = passwordIssues(adminPassword)
    if (issues.length) {
      notes.push(`[ORGANIZER ACCOUNT — NOT CREATED] SEED_ADMIN_PASSWORD is too weak: ${issues.join(' ')}`)
    } else {
      const role = await prisma.adminRole.findUnique({ where: { key: 'super_admin' } })
      if (!role) throw new Error('super_admin role is missing — run ensureRolePresets first.')
      const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
      if (existing) {
        notes.push(`Organizer account ${adminEmail} already exists — left untouched.`)
      } else {
        await prisma.adminUser.create({
          data: {
            email: adminEmail,
            name: adminName || 'Summit Director',
            roleId: role.id,
            passwordHash: await hashPassword(adminPassword),
          },
        })
        notes.push(`Organizer account created for ${adminEmail} (Super admin).`)
      }
    }
  } else {
    notes.push(
      '[ORGANIZER ACCOUNT — NOT CREATED] Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (or add staff from /admin/staff) to sign in to the organizer workspace.',
    )
  }

  /* --- Policies ----------------------------------------------------------- */
  for (const policy of POLICIES) {
    await prisma.policy.upsert({
      where: { slug: policy.slug },
      create: { ...policy, body: null, published: false },
      // An organizer's published text is never overwritten by reseeding.
      update: { title: policy.title, summary: policy.summary },
    })
  }
  notes.push(
    `${POLICIES.length} policy records ensured. Bodies are empty and unpublished, so each page shows [POLICY TEXT — TBD] until approved text is supplied.`,
  )

  /* --- FAQ ---------------------------------------------------------------- */
  for (const [index, item] of FAQ.entries()) {
    const existing = await prisma.fAQItem.findFirst({ where: { question: item.question } })
    if (existing) {
      await prisma.fAQItem.update({
        where: { id: existing.id },
        data: { category: existing.category ?? item.category, order: existing.order || index },
      })
      continue
    }
    await prisma.fAQItem.create({
      data: { question: item.question, answer: null, category: item.category, order: index, published: true },
    })
  }
  notes.push(`${FAQ.length} FAQ questions ensured — every answer is null, rendered as [ANSWER — TBD].`)

  /* --- Placeholder committees -------------------------------------------- */
  const existingCommittees = await prisma.committee.count()
  if (existingCommittees === 0) {
    for (let index = 0; index < PLACEHOLDER_COMMITTEE_COUNT; index += 1) {
      await prisma.committee.create({
        data: {
          slug: `committee-placeholder-${index + 1}`,
          // name, type, topic, language, experienceLevel, capacity, chairName all
          // stay null: the public card shows the matching placeholder instead.
          status: 'tbd',
          isPlaceholder: true,
          displayOrder: index,
        },
      })
    }
    notes.push(
      `${PLACEHOLDER_COMMITTEE_COUNT} placeholder committees created. They render as "[COMMITTEE NAME — TBD] / Committee information coming soon" everywhere, including registration preferences.`,
    )
  } else {
    notes.push(`Committees already present (${existingCommittees}) — no placeholder rows added.`)
  }

  /* --- Explicitly left empty --------------------------------------------- */
  notes.push(
    [
      'Left intentionally empty so the platform shows placeholders rather than guesses:',
      '  • site settings (event date, time zone, eligibility, fees, platform, contact, brand colour)',
      '  • schedule sessions',
      '  • payments (provider unconfigured: checkout stays disabled, [PAYMENT DETAILS — TBD])',
      '  • participants & applications (created only through the real registration flow)',
    ].join('\n'),
  )

  console.log('\n✓ Trishul Summit seed complete\n')
  for (const note of notes) console.log(`  • ${note}`)
  console.log(
    `\nNext: npm run dev, then sign in at /admin/sign-in${adminEmail && adminPassword ? ` as ${adminEmail}` : ''}.`,
  )
}

main()
  .catch((error) => {
    console.error('\n✗ Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
