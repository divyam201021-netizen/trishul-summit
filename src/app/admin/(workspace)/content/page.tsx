import Link from 'next/link'
import { FileText, HelpCircle, Megaphone, Plus } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/client'
import { getEventConfig } from '@/lib/config'
import { upsertFaqItem, upsertPolicy } from '@/lib/admin/actions'
import { formatDateTime, pluralize } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  SectionHeading,
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm } from '@/components/ui/action-form'
import { SettingsEditor } from '@/components/admin/settings-editor'
import { PendingContent, Tbd } from '@/components/ui/placeholder'

/**
 * Content management.
 *
 * Two very different kinds of text live here and are kept apart on purpose:
 *  • editorial content (narrative copy, FAQ, policies, announcements) — supplied
 *    by people, published when approved;
 *  • configuration (dates, fees, eligibility) — which is factual and lives under
 *    Settings.
 * An unanswered FAQ row is a valid, honest state: the question is published and
 * the answer reads `[ANSWER — TBD]`.
 */
export default async function AdminContentPage() {
  await requireAdmin(PERMISSIONS.contentManage)
  const [config, faq, policies, announcements] = await Promise.all([
    getEventConfig(),
    prisma.fAQItem.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
    prisma.policy.findMany({ orderBy: { slug: 'asc' } }),
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  const unanswered = faq.filter((item) => !item.answer).length
  const unpublishedPolicies = policies.filter((policy) => !policy.published).length

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Editorial"
        title="Content"
        description="Narrative copy, the FAQ, policies and the announcement banner. Nothing here is auto-generated — text is published only when a person writes and approves it."
      />

      {unanswered > 0 ? (
        <Alert tone="neutral" title={`${pluralize(unanswered, 'FAQ answer')} still to be published`}>
          Those questions are live with <span className="font-mono text-xs">[ANSWER — TBD]</span> instead of a guess. That
          is intentional: an unanswered question sets an expectation the committee can meet, a fabricated answer cannot.
        </Alert>
      ) : null}

      {unpublishedPolicies > 0 ? (
        <Alert tone="warning" title={`${pluralize(unpublishedPolicies, 'policy')} not published yet`}>
          Registration references the Privacy Notice, Terms of Participation and Code of Conduct. Their pages exist and
          explain that the text is pending, but participants cannot read terms that have not been published — publish them
          before opening registration publicly.
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SettingsEditor
            config={config}
            groupKeys={['content', 'announcement']}
            title="Editorial copy & banner"
            description="Value-proposition copy used on the homepage, about page and preparation sections, plus the optional site-wide announcement banner."
          />

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <HelpCircle className="size-4 meta" aria-hidden="true" />
                Frequently asked questions
              </CardTitle>
              <p className="text-sm leading-relaxed text-ink-600">
                Questions are published immediately; answers appear on the public FAQ and in the portal as soon as you write
                them. Categories power the filter on the FAQ page.
              </p>
            </CardHeader>
            <CardBody className="space-y-5">
              {faq.map((item) => (
                <details key={item.id} className="rounded-lg border border-ink-200 bg-paper-raised">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900">{item.question}</span>
                      {item.answer ? <Badge tone="positive">Answered</Badge> : <Badge tone="warning">[ANSWER — TBD]</Badge>}
                      {item.published ? null : <Badge tone="outline">Hidden</Badge>}
                    </span>
                    <span className="text-xs meta">
                      order {item.order}
                      {item.category ? ` · ${item.category}` : ''}
                    </span>
                  </summary>
                  <div className="border-t border-ink-200 p-4">
                    <ActionForm action={upsertFaqItem} submitLabel="Save question" submitVariant="brand" submitSize="sm">
                      <input type="hidden" name="id" value={item.id} />
                      <Field label="Question" required>
                        <Input name="question" defaultValue={item.question} maxLength={300} required />
                      </Field>
                      <Field
                        label="Answer"
                        hint="Leave empty to keep the question visible with [ANSWER — TBD]. Write in the same plain, confident voice as the rest of the site."
                      >
                        <Textarea name="answer" defaultValue={item.answer ?? ''} rows={6} maxLength={4000} />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Category">
                          <Input name="category" defaultValue={item.category ?? ''} maxLength={60} />
                        </Field>
                        <Field label="Order">
                          <Input name="order" type="number" defaultValue={item.order} />
                        </Field>
                        <Field label="Visibility">
                          <NativeSelect name="published" defaultValue={item.published ? 'on' : ''}>
                            <option value="on">Published</option>
                            <option value="">Hidden</option>
                          </NativeSelect>
                        </Field>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              ))}

              <div className="rounded-lg border border-dashed border-ink-300 bg-paper-sunk/50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add a question
                </p>
                <div className="mt-4">
                  <ActionForm action={upsertFaqItem} submitLabel="Add question" submitVariant="secondary" submitSize="sm" resetOnSuccess>
                    <Field label="Question" required>
                      <Input name="question" maxLength={300} required />
                    </Field>
                    <Field label="Answer" hint="Optional now — the question publishes with the answer placeholder.">
                      <Textarea name="answer" rows={4} maxLength={4000} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Category">
                        <Input name="category" maxLength={60} />
                      </Field>
                      <Field label="Order">
                        <Input name="order" type="number" defaultValue={faq.length} />
                      </Field>
                      <Field label="Visibility">
                        <NativeSelect name="published" defaultValue="on">
                          <option value="on">Published</option>
                          <option value="">Hidden</option>
                        </NativeSelect>
                      </Field>
                    </div>
                  </ActionForm>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <FileText className="size-4 meta" aria-hidden="true" />
                Policies
              </CardTitle>
              <p className="text-sm leading-relaxed text-ink-600">
                Each policy has a permanent URL and a version number. Changing a version is how you signal that the terms
                materially changed — the version a participant accepted is stored with their consent.
              </p>
            </CardHeader>
            <CardBody className="space-y-5">
              {policies.map((policy) => (
                <details key={policy.id} className="rounded-lg border border-ink-200 bg-paper-raised">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900">{policy.title}</span>
                      <Badge tone={policy.published ? 'positive' : 'warning'}>
                        {policy.published ? 'Published' : 'Not published'}
                      </Badge>
                      <span className="font-mono text-2xs meta">v{policy.version}</span>
                    </span>
                    <span className="text-xs meta">updated {formatDateTime(policy.updatedAt)}</span>
                  </summary>
                  <div className="border-t border-ink-200 p-4">
                    <ActionForm action={upsertPolicy} submitLabel="Save policy" submitVariant="brand" submitSize="sm">
                      <input type="hidden" name="slug" value={policy.slug} />
                      <Field label="Title" required>
                        <Input name="title" defaultValue={policy.title} maxLength={160} required />
                      </Field>
                      <Field label="Summary" hint="One or two sentences shown above the policy.">
                        <Textarea name="summary" defaultValue={policy.summary ?? ''} rows={2} maxLength={400} />
                      </Field>
                      <Field
                        label="Body"
                        hint="Plain text. Leave empty and the page states clearly that the approved text is pending."
                      >
                        <Textarea name="body" defaultValue={policy.body ?? ''} rows={12} maxLength={12000} className="font-mono text-xs" />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Version">
                          <Input name="version" defaultValue={policy.version} maxLength={20} />
                        </Field>
                        <Field label="Visibility">
                          <NativeSelect name="published" defaultValue={policy.published ? 'on' : ''}>
                            <option value="on">Published</option>
                            <option value="">Not published</option>
                          </NativeSelect>
                        </Field>
                      </div>
                    </ActionForm>
                    <p className="mt-4 text-xs meta">
                      Public page:{' '}
                      <Link href={`/policies/${policy.slug}`} className="underline underline-offset-2">
                        /policies/{policy.slug}
                      </Link>
                    </p>
                  </div>
                </details>
              ))}
            </CardBody>
          </Card>

          <SettingsEditor
            config={config}
            groupKeys={['seo', 'legal']}
            title="Search previews & legal"
            description="Titles, descriptions and social preview imagery for public pages, plus the policy bundle version participants accept."
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Megaphone className="size-4 meta" aria-hidden="true" />
                Recent announcements
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {announcements.length ? (
                <ul className="space-y-3">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
                      <p className="text-sm font-medium text-ink-900">{announcement.title}</p>
                      <p className="text-xs meta">
                        {announcement.publishedAt ? `Published ${formatDateTime(announcement.publishedAt)}` : 'Draft'} ·{' '}
                        {announcement.audience}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm meta">No announcements yet.</p>
              )}
              <Link href="/admin/communications" className="link-underline inline-block text-sm text-brand-700">
                Manage announcements & messaging
              </Link>
            </CardBody>
          </Card>

          <PendingContent title="Placeholders are visible on purpose">
            Every field above shows what participants currently see, including{' '}
            <Tbd label="OUTSTANDING CONTENT" /> markers. That is how the committee knows what is left to write — without a
            checklist that can silently drift out of date.
          </PendingContent>

          <Card>
            <CardBody className="space-y-2 text-xs leading-relaxed meta">
              <p className="font-medium text-ink-700">Versioning</p>
              <p>
                Policy versions are stored with each consent record. If you materially change the Terms or the Code of
                Conduct, increment the version so it is clear which text each participant agreed to.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
