import Link from 'next/link'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/client'
import { listCommittees } from '@/lib/content/queries'
import { getEventConfig } from '@/lib/config'
import { deleteScheduleSession, upsertScheduleSession } from '@/lib/admin/actions'
import { timeZoneOptions } from '@/lib/data/geo'
import { formatIsoDate, pluralize } from '@/lib/utils'
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
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm, ConfirmActionForm } from '@/components/ui/action-form'
import { Tbd } from '@/components/ui/placeholder'

/**
 * Schedule management.
 *
 * A session can be published without a time: the public and portal schedules
 * then render `[START / END TIME — TBD]` instead of an unlabelled time. The
 * warning below is a first-class part of this screen because publishing an
 * event time without its time zone is the single most misleading thing this
 * platform could do.
 */
export default async function AdminSchedulePage() {
  await requireAdmin(PERMISSIONS.scheduleManage)
  const [sessions, committees, config] = await Promise.all([
    prisma.scheduleSession.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { committee: { select: { slug: true, name: true } } },
    }),
    listCommittees(),
    getEventConfig(),
  ])

  const zones = timeZoneOptions()
  const canonicalZone = config.text('event.timeZone')
  const missingZone = sessions.filter((session) => (session.startTime || session.endTime) && !session.timeZone && !canonicalZone)

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Programme"
        title="Schedule"
        description="Session titles, days, times and platforms. Times are only displayed publicly when an explicit time zone exists."
      />

      {!canonicalZone ? (
        <Alert tone="warning" title="The canonical event time zone is not set">
          Session times stay hidden on every public and portal page until a time zone exists. Set{' '}
          <Link href="/admin/settings" className="underline underline-offset-2">
            the event time zone
          </Link>{' '}
          first, or give individual sessions their own zone.
        </Alert>
      ) : null}

      {missingZone.length ? (
        <Alert tone="error" title={`${pluralize(missingZone.length, 'session')} cannot display a time`}>
          These sessions have a start or end time but no time zone, and no canonical event time zone is configured. They
          publish as <Tbd label="START / END TIME" /> rather than a time that could be misread by participants in other
          zones.
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {sessions.length ? (
            sessions.map((session) => (
              <Card key={session.id}>
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900">
                        {session.title ?? <span className="font-mono text-xs text-warning-700">[SESSION NAME — TBD]</span>}
                      </span>
                      <Badge tone={session.published ? 'positive' : 'outline'}>
                        {session.published ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge tone="outline">{session.sessionType ?? 'type TBD'}</Badge>
                      {session.startTime || session.endTime ? (
                        <Badge tone={session.timeZone || canonicalZone ? 'neutral' : 'warning'}>
                          {session.startTime ?? '—'}–{session.endTime ?? '—'} {session.timeZone ?? canonicalZone ?? 'no time zone'}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-xs meta">
                      {session.dayLabel ?? (session.date ? formatIsoDate(session.date) : 'Day label TBD')}
                      {session.committee ? ` · ${session.committee.name ?? 'placeholder committee'}` : ''}
                    </span>
                  </summary>

                  <div className="border-t border-ink-200 p-4">
                    <ActionForm action={upsertScheduleSession} submitLabel="Save session" submitVariant="brand" submitSize="sm">
                      <input type="hidden" name="id" value={session.id} />
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Session title" className="md:col-span-2">
                          <Input name="title" defaultValue={session.title ?? ''} maxLength={180} />
                        </Field>
                        <Field label="Day label" hint='e.g. "Day 1" — free text your programme uses.'>
                          <Input name="dayLabel" defaultValue={session.dayLabel ?? ''} maxLength={80} />
                        </Field>
                        <Field label="Date">
                          <Input name="date" type="date" defaultValue={formatIsoDate(session.date) ?? ''} />
                        </Field>
                        <Field label="Start time" hint="24-hour, in the session's time zone.">
                          <Input name="startTime" type="time" defaultValue={session.startTime ?? ''} />
                        </Field>
                        <Field label="End time">
                          <Input name="endTime" type="time" defaultValue={session.endTime ?? ''} />
                        </Field>
                        <Field
                          label="Time zone"
                          hint={`Leave empty to inherit the canonical event time zone${canonicalZone ? ` (${canonicalZone})` : ' — which is not set yet'}.`}
                        >
                          <NativeSelect name="timeZone" defaultValue={session.timeZone ?? ''}>
                            <option value="">Inherit event time zone</option>
                            {zones.common.map((zone) => (
                              <option key={zone} value={zone}>
                                {zone}
                              </option>
                            ))}
                            {zones.all
                              .filter((zone) => !zones.common.includes(zone))
                              .map((zone) => (
                                <option key={zone} value={zone}>
                                  {zone}
                                </option>
                              ))}
                          </NativeSelect>
                        </Field>
                        <Field label="Session type">
                          <NativeSelect name="sessionType" defaultValue={session.sessionType ?? ''}>
                            <option value="">Not specified</option>
                            <option value="plenary">Plenary</option>
                            <option value="committee">Committee session</option>
                            <option value="workshop">Workshop</option>
                            <option value="ceremony">Ceremony</option>
                            <option value="break">Break</option>
                          </NativeSelect>
                        </Field>
                        <Field label="Platform">
                          <Input name="platform" defaultValue={session.platform ?? ''} maxLength={120} />
                        </Field>
                        <Field label="Committee" className="md:col-span-2">
                          <NativeSelect name="committeeId" defaultValue={session.committeeId ?? ''}>
                            <option value="">Not committee-specific</option>
                            {committees.map((committee) => (
                              <option key={committee.id} value={committee.id}>
                                {committee.name ?? `Placeholder ${committee.displayOrder + 1}`}
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field label="Description" className="md:col-span-2">
                          <Textarea name="description" defaultValue={session.description ?? ''} rows={3} maxLength={2000} />
                        </Field>
                        <Field label="Order" hint="Lower numbers appear first within a day.">
                          <Input name="order" type="number" defaultValue={session.order} />
                        </Field>
                        <Field label="Visibility">
                          <label className="flex items-center gap-2 pt-2 text-sm text-ink-700">
                            <input type="checkbox" name="published" defaultChecked={session.published} className="size-4 rounded border-ink-400" />
                            Published on the schedule
                          </label>
                        </Field>
                      </div>
                    </ActionForm>

                    <div className="mt-5 border-t border-ink-100 pt-4">
                      <ConfirmActionForm
                        action={deleteScheduleSession}
                        hidden={{ id: session.id }}
                        label="Delete session"
                        confirmTitle={`Delete ${session.title ?? 'this session'}?`}
                        confirmDescription="The session is removed from the programme immediately. Participants who already read the schedule will see it disappear."
                        confirmLabel="Delete session"
                        icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                      />
                    </div>
                  </div>
                </details>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<EMPTY_STATE_ICONS.noSchedule className="size-5" aria-hidden="true" />}
              title="No sessions yet"
              description="Add your first session on the right. You can create the structure now — days, types and order — and add times once the time zone is confirmed."
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Plus className="size-4 meta" aria-hidden="true" />
                Add a session
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ActionForm action={upsertScheduleSession} submitLabel="Create session" submitVariant="brand" submitSize="sm" resetOnSuccess>
                <Field label="Session title" hint="Optional — the placeholder is used until you publish one.">
                  <Input name="title" maxLength={180} />
                </Field>
                <Field label="Day label">
                  <Input name="dayLabel" maxLength={80} placeholder="Day 1" />
                </Field>
                <Field label="Date">
                  <Input name="date" type="date" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Start time">
                    <Input name="startTime" type="time" />
                  </Field>
                  <Field label="End time">
                    <Input name="endTime" type="time" />
                  </Field>
                </div>
                <Field label="Session type">
                  <NativeSelect name="sessionType" defaultValue="committee">
                    <option value="">Not specified</option>
                    <option value="plenary">Plenary</option>
                    <option value="committee">Committee session</option>
                    <option value="workshop">Workshop</option>
                    <option value="ceremony">Ceremony</option>
                    <option value="break">Break</option>
                  </NativeSelect>
                </Field>
                <Field label="Visibility">
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input type="checkbox" name="published" defaultChecked className="size-4 rounded border-ink-400" />
                    Publish immediately
                  </label>
                </Field>
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <CalendarClock className="size-4 meta" aria-hidden="true" />
                Time zone integrity
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>
                Canonical event time zone:{' '}
                {canonicalZone ? (
                  <span className="font-medium text-ink-900">{canonicalZone}</span>
                ) : (
                  <Tbd label="TIME ZONE" />
                )}
              </p>
              <p>
                Participants see the canonical time plus an optional conversion to their own device time. The canonical
                time is always the authoritative one, because that is the time the organizing committee runs to.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
