import Link from 'next/link'
import { LayoutList, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { allocationOverview } from '@/lib/content/queries'
import { deleteCommittee, upsertCommittee } from '@/lib/admin/actions'
import { pluralize } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EMPTY_STATE_ICONS,
  SectionHeading,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm, ConfirmActionForm } from '@/components/ui/action-form'
import { PendingContent } from '@/components/ui/placeholder'

/**
 * Committee management.
 *
 * A committee row can exist without any official detail: `name`, `type`,
 * `topic`, `capacity` and `chairName` may all be null, and every public surface
 * renders the matching placeholder. That is what makes it possible to open
 * registration before the committee list is final without inventing anything.
 */
export default async function AdminCommitteesPage() {
  await requireAdmin(PERMISSIONS.committeesManage)
  const rows = await allocationOverview()

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Programme"
        title="Committees"
        description="Names, agendas, languages, capacities and availability. Anything left empty publishes as [LABEL — TBD] rather than a guess."
      />

      <Alert tone="neutral" title="Placeholders are a feature, not a gap">
        A committee with no name yet still appears in the registration preferences list, labelled clearly as awaiting
        official detail. Participants are told exactly what is and is not decided.
      </Alert>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <LayoutList className="size-4 meta" aria-hidden="true" />
                {rows.length ? pluralize(rows.length, 'committee') : 'No committees'}
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              {rows.length ? (
                rows.map((row) => (
                  <details key={row.committee.id} className="group rounded-lg border border-ink-200 bg-paper-raised">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink-900">
                          {row.committee.name ?? (
                            <span className="font-mono text-xs text-warning-700">[COMMITTEE NAME — TBD]</span>
                          )}
                        </span>
                        {row.committee.isPlaceholder ? <Badge tone="warning">Placeholder</Badge> : <Badge tone="positive">Published</Badge>}
                        <Badge tone={row.committee.status === 'open' ? 'positive' : row.committee.status === 'waitlist' ? 'warning' : 'neutral'}>
                          {row.committee.status === 'tbd' ? '[OPEN / CLOSED — TBD]' : row.committee.status}
                        </Badge>
                      </span>
                      <span className="text-xs meta tabular-nums">
                        {row.assigned}
                        {row.capacity != null ? ` / ${row.capacity}` : ''} allocated · {row.preferences} preference
                        {row.preferences === 1 ? '' : 's'}
                        {row.waitlist ? ` · ${row.waitlist} waitlisted` : ''}
                      </span>
                    </summary>

                    <div className="border-t border-ink-200 p-4">
                      <ActionForm action={upsertCommittee} submitLabel="Save committee" submitVariant="brand" submitSize="sm">
                        <input type="hidden" name="id" value={row.committee.id} />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Field label="Committee name" hint="Leave empty to keep the name placeholder.">
                            <Input name="name" defaultValue={row.committee.name ?? ''} maxLength={160} />
                          </Field>
                          <Field
                            label="URL slug"
                            hint="Used in the public URL /committees/… Leave empty to keep the current one."
                          >
                            <Input name="slug" defaultValue={row.committee.slug} maxLength={80} />
                          </Field>
                          <Field label="Type">
                            <Input name="type" defaultValue={row.committee.type ?? ''} maxLength={80} placeholder="General Assembly, Crisis, Specialised…" />
                          </Field>
                          <Field label="Language">
                            <Input name="language" defaultValue={row.committee.language ?? ''} maxLength={60} placeholder="English" />
                          </Field>
                          <Field label="Experience level">
                            <NativeSelect name="experienceLevel" defaultValue={row.committee.experienceLevel ?? ''}>
                              <option value="">Not published yet</option>
                              <option value="all">Open to all levels</option>
                              <option value="beginner">Beginner friendly</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </NativeSelect>
                          </Field>
                          <Field label="Capacity" hint="Minimum 2. Leave empty if capacity is not confirmed.">
                            <Input
                              name="capacity"
                              type="number"
                              min={2}
                              defaultValue={row.committee.capacity ?? ''}
                              placeholder="Not confirmed"
                            />
                          </Field>
                          <Field label="Availability">
                            <NativeSelect name="status" defaultValue={row.committee.status === 'tbd' ? 'tbd' : row.committee.status}>
                              <option value="tbd">Not decided yet ([OPEN / CLOSED — TBD])</option>
                              <option value="open">Open for preferences</option>
                              <option value="waitlist">Waitlist only</option>
                              <option value="closed">Closed</option>
                            </NativeSelect>
                          </Field>
                          <Field label="Display order" hint="Lower numbers appear first.">
                            <Input name="displayOrder" type="number" defaultValue={row.committee.displayOrder} />
                          </Field>
                          <Field label="Chair name" className="md:col-span-2">
                            <Input name="chairName" defaultValue={row.committee.chairName ?? ''} maxLength={120} placeholder="Only publish what the organizer has confirmed" />
                          </Field>
                          <Field label="Chair title" className="md:col-span-2">
                            <Input name="chairTitle" defaultValue={row.committee.chairTitle ?? ''} maxLength={120} />
                          </Field>
                          <Field label="Agenda / topic" className="md:col-span-2">
                            <Textarea name="topic" defaultValue={row.committee.topic ?? ''} rows={2} maxLength={240} />
                          </Field>
                          <Field label="Description" className="md:col-span-2">
                            <Textarea name="description" defaultValue={row.committee.description ?? ''} rows={3} maxLength={3000} />
                          </Field>
                          <Field
                            label="Who this committee suits"
                            className="md:col-span-2"
                            hint="Shown to participants after allocation and on the public committee page."
                          >
                            <Textarea name="expectedProfile" defaultValue={row.committee.expectedProfile ?? ''} rows={2} maxLength={1200} />
                          </Field>
                          <Field label="Preparation guidance" className="md:col-span-2">
                            <Textarea name="preparationInfo" defaultValue={row.committee.preparationInfo ?? ''} rows={3} maxLength={2000} />
                          </Field>
                        </div>
                      </ActionForm>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                        <Link href={`/committees/${row.committee.slug}`} className="link-underline text-sm text-brand-700">
                          View public page
                        </Link>
                        <ConfirmActionForm
                          action={deleteCommittee}
                          hidden={{ id: row.committee.id }}
                          label="Delete committee"
                          confirmTitle={`Delete ${row.committee.name ?? 'this placeholder committee'}?`}
                          confirmDescription="Deleting removes it from the committee directory and from participant preference lists. Existing records that referenced it keep their history, but the reference is gone."
                          confirmLabel="Delete committee"
                          variant="ghost"
                          icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                        />
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <EmptyState
                  icon={<EMPTY_STATE_ICONS.noCommittees className="size-5" aria-hidden="true" />}
                  title="No committees yet"
                  description="Add the first committee on the right. You can save it with only a slug and fill in the rest once the official list is confirmed."
                />
              )}
            </CardBody>
          </Card>

          {rows.some((row) => row.capacity != null && row.assigned >= row.capacity) ? (
            <Alert tone="warning" title="Some committees are at or above capacity">
              Allocation can still be overridden deliberately on an application, but the override and its reason are
              recorded in the audit trail and in the allocation history.
            </Alert>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Plus className="size-4 meta" aria-hidden="true" />
                Add a committee
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ActionForm action={upsertCommittee} submitLabel="Create committee" submitVariant="brand" submitSize="sm" resetOnSuccess>
                <div className="grid gap-4">
                  <Field label="Committee name" hint="Optional now — the placeholder is shown until you publish a name.">
                    <Input name="name" maxLength={160} />
                  </Field>
                  <Field label="URL slug" required hint="Lower-case, hyphens only.">
                    <Input name="slug" required maxLength={80} placeholder="disarmament-and-security" />
                  </Field>
                  <Field label="Type">
                    <Input name="type" maxLength={80} />
                  </Field>
                  <Field label="Language">
                    <Input name="language" maxLength={60} />
                  </Field>
                  <Field label="Capacity">
                    <Input name="capacity" type="number" min={2} />
                  </Field>
                  <Field label="Availability">
                    <NativeSelect name="status" defaultValue="tbd">
                      <option value="tbd">Not decided yet</option>
                      <option value="open">Open for preferences</option>
                      <option value="waitlist">Waitlist only</option>
                      <option value="closed">Closed</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Agenda / topic">
                    <Textarea name="topic" rows={2} maxLength={240} />
                  </Field>
                </div>
              </ActionForm>
            </CardBody>
          </Card>

          <PendingContent title="Nothing here is auto-filled">
            The platform will never invent a committee name, chair or agenda to make the directory look complete. A
            visibly incomplete page is better than a misleading one.
          </PendingContent>

          <Card>
            <CardBody className="space-y-2 text-xs leading-relaxed meta">
              <p className="flex items-center gap-2 font-medium text-ink-700">
                <TriangleAlert className="size-3.5" aria-hidden="true" />
                Capacity and honest scarcity
              </p>
              <p>
                Seats remaining are computed from real allocations. Publication of a “nearly full” state only happens
                when allocations actually approach capacity — there are no artificial counters anywhere on this platform.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
