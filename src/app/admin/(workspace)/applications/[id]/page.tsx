import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  History,
  Lock,
  Mail,
  MessageSquare,
  Scale,
  UserRound,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { getApplicationForAdmin } from '@/lib/applications/queries'
import { listCommittees } from '@/lib/content/queries'
import { ALLOWED_TRANSITIONS, statusMeta } from '@/lib/registration/status'
import { PAYMENT_STATUS_META } from '@/lib/payments'
import { addReviewerNote, allocateCommittee, recordManualPayment, updateApplicationStatus } from '@/lib/admin/actions'
import { formatDateTime, formatMoney } from '@/lib/utils'
import {
  Alert,
  Badge,
  Breadcrumbs,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EMPTY_STATE_ICONS,
  KeyValue,
  StatusBadge,
} from '@/components/ui/primitives'
import { CheckboxField, Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm } from '@/components/ui/action-form'
import { Tbd } from '@/components/ui/placeholder'

/**
 * Application detail — the working surface for a reviewer.
 *
 * Ordering is deliberate: decision first (status, allocation), evidence second
 * (answers, preferences, history), and internal notes last so a reviewer reads
 * the applicant's own words before anyone else's.
 */
export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await requireAdmin(PERMISSIONS.applicationsView)

  const [application, committees] = await Promise.all([getApplicationForAdmin(id), listCommittees()])
  if (!application) notFound()

  const can = (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
    hasPermission(admin.permissions, permission)

  const meta = statusMeta(application.status)
  const canSeeSensitive = can(PERMISSIONS.applicationsSensitive)
  const responses = Object.entries(application.responsesJson ? safeParse(application.responsesJson) : {})
  const transitions = ALLOWED_TRANSITIONS[meta.status] ?? []

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Applications', href: '/admin/applications' },
          { label: application.reference },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={application.status} />
            <span className="font-mono text-2xs tracking-[0.14em] meta uppercase">{application.reference}</span>
            {application.policyVersion ? <Badge tone="outline">Policies v{application.policyVersion}</Badge> : null}
          </div>
          <h1 className="font-display text-display-sm">{canSeeSensitive ? application.participant.fullName : 'Applicant (restricted)'}</h1>
          <p className="text-sm text-ink-600">{meta.explanation}</p>
        </div>
        <Link href="/admin/applications" className="link-underline inline-flex items-center gap-1.5 text-sm text-brand-700">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to the queue
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Decision ------------------------------------------------------- */}
          {can(PERMISSIONS.applicationsStatus) ? (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2">
                  <Scale className="size-4 meta" aria-hidden="true" />
                  Record a decision
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {transitions.length === 0 ? (
                  <Alert tone="neutral" title="This application is in a final state">
                    No further transitions are permitted from {meta.label}. Reopen the application by moving it back a
                    step if the decision has genuinely changed — the history will record both moves.
                  </Alert>
                ) : (
                  <ActionForm action={updateApplicationStatus} submitLabel="Save status" submitVariant="brand">
                    <input type="hidden" name="applicationId" value={application.id} />

                    <Field
                      label="New status"
                      required
                      hint="Only transitions that make sense from the current status are listed."
                    >
                      <NativeSelect name="status" defaultValue={transitions[0]} required>
                        {transitions.map((status) => (
                          <option key={status} value={status}>
                            {statusMeta(status).label}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>

                    <Field
                      label="Message to the applicant"
                      hint="Shown in the participant portal and, if you notify them, included in the email. Write it as a person would."
                    >
                      <Textarea name="publicNote" rows={3} maxLength={400} />
                    </Field>

                    <CheckboxField
                      name="notify"
                      label="Email the applicant about this change"
                      description="Uses the mail transport configured for this deployment. Every attempt is recorded in the delivery log."
                    />
                  </ActionForm>
                )}
              </CardBody>
            </Card>
          ) : null}

          {/* Allocation ------------------------------------------------------ */}
          {can(PERMISSIONS.applicationsAssign) ? (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2">
                  <UserRound className="size-4 meta" aria-hidden="true" />
                  Committee allocation
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="rounded-lg border border-ink-200 bg-paper-sunk/60 p-4 text-sm">
                  <p className="eyebrow meta">Currently allocated</p>
                  <p className="mt-1 text-ink-800">
                    {application.assignedCommittee ? (
                      application.assignedCommittee.name ?? (
                        <span className="font-mono text-xs text-warning-700">[COMMITTEE NAME — TBD] (placeholder)</span>
                      )
                    ) : (
                      'Not allocated'
                    )}
                  </p>
                </div>

                {committees.length ? (
                  <ActionForm action={allocateCommittee} submitLabel="Save allocation" submitVariant="brand">
                    <input type="hidden" name="applicationId" value={application.id} />

                    <Field label="Committee" required>
                      <NativeSelect name="committeeId" defaultValue={application.assignedCommitteeId ?? ''} required>
                        <option value="">Select a committee</option>
                        {committees.map((committee) => (
                          <option key={committee.id} value={committee.id}>
                            {committee.name ?? `Placeholder ${committee.displayOrder + 1}`}
                            {committee.capacity != null ? ` — ${committee.assignedCount}/${committee.capacity} allocated` : ''}
                            {committee.status !== 'open' ? ` (${committee.status})` : ''}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>

                    <Field label="Role in committee" hint="Optional. e.g. delegate, chair, observer.">
                      <Input name="role" maxLength={80} />
                    </Field>

                    <Field label="Reason" hint="Recorded in the allocation history so a later reviewer understands the decision.">
                      <Textarea name="reason" rows={2} maxLength={400} />
                    </Field>

                    <CheckboxField
                      name="overrideCapacity"
                      label="Override capacity for this allocation"
                      description="Only tick this deliberately: it takes the committee above its published capacity and the warning is recorded with your name."
                    />
                  </ActionForm>
                ) : (
                  <EmptyState
                    icon={<EMPTY_STATE_ICONS.noCommittees className="size-5" aria-hidden="true" />}
                    title="No committees to allocate against"
                    description="Create at least one committee before allocating participants. Placeholder committees work for structure but publish as “Committee information coming soon”."
                  />
                )}
              </CardBody>
            </Card>
          ) : null}

          {/* Applicant evidence -------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle as="h2">Applicant responses</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Applying as">
                  {application.rolePreference ? application.rolePreference.replace(/_/g, ' ') : <Tbd label="ROLE" />}
                </KeyValue>
                <KeyValue label="MUN experience">
                  {application.munExperience ? application.munExperience.replace(/_/g, ' ') : 'Not provided'}
                </KeyValue>
                <KeyValue label="Experience detail">{application.experienceDetail || 'Not provided'}</KeyValue>
                <KeyValue label="Motivation">
                  {application.motivation ? <span className="whitespace-pre-line">{application.motivation}</span> : 'Not provided'}
                </KeyValue>
                <KeyValue label="Topic interest">
                  {application.topicInterest ? <span className="whitespace-pre-line">{application.topicInterest}</span> : 'Not provided'}
                </KeyValue>
                {Object.entries(applicationPreferences(application.preferences)).map(([label, value]) => (
                  <KeyValue key={label} label={label}>
                    {value}
                  </KeyValue>
                ))}
                {responses.map(([key, value]) => (
                  <KeyValue key={key} label={key}>
                    {String(value)}
                  </KeyValue>
                ))}
              </dl>
            </CardBody>
          </Card>

          {/* Notes ---------------------------------------------------------- */}
          {can(PERMISSIONS.applicationsNotes) ? (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2">
                  <Lock className="size-4 meta" aria-hidden="true" />
                  Internal reviewer notes
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                <p className="text-sm text-ink-600">
                  Visible only inside the workspace, with your name attached. Participants see status changes and their
                  explanations — never these notes.
                </p>
                <ActionForm action={addReviewerNote} submitLabel="Add note" resetOnSuccess>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <Field label="Note" required>
                    <Textarea name="body" rows={3} maxLength={2000} required />
                  </Field>
                </ActionForm>
                {application.notes.length ? (
                  <ul className="divide-y divide-ink-100">
                    {application.notes.map((note) => (
                      <li key={note.id} className="space-y-1 py-3">
                        <p className="text-sm leading-relaxed whitespace-pre-line text-ink-800">{note.body}</p>
                        <p className="text-xs meta">
                          {note.author?.name ?? 'Unknown author'} · {formatDateTime(note.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm meta">No internal notes yet.</p>
                )}
              </CardBody>
            </Card>
          ) : null}

          {/* History -------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <History className="size-4 meta" aria-hidden="true" />
                History
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="space-y-3">
                <p className="eyebrow meta">Status changes</p>
                <ul className="space-y-3">
                  {application.statusHistory.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center gap-3 text-sm">
                      <StatusBadge status={entry.toStatus} />
                      {entry.fromStatus ? (
                        <span className="text-xs meta">from {statusMeta(entry.fromStatus).label}</span>
                      ) : null}
                      <span className="text-xs meta">
                        {formatDateTime(entry.createdAt)} · {entry.actor?.name ?? 'system'}
                      </span>
                      {entry.publicNote ? <span className="text-ink-600">“{entry.publicNote}”</span> : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="eyebrow meta">Allocation history (append-only)</p>
                {application.assignments.length ? (
                  <ul className="space-y-3">
                    {application.assignments.map((assignment) => (
                      <li key={assignment.id} className="text-sm">
                        <span className="text-ink-800">{assignment.committee.name ?? 'Placeholder committee'}</span>
                        {assignment.role ? <span className="text-ink-600"> · {assignment.role}</span> : null}
                        {assignment.revokedAt ? <Badge tone="neutral" className="ml-2">revoked</Badge> : null}
                        <span className="block text-xs meta">
                          {formatDateTime(assignment.createdAt)} · {assignment.assignedBy?.name ?? 'system'}
                          {assignment.reason ? ` · ${assignment.reason}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm meta">No allocation recorded yet.</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right rail -------------------------------------------------------- */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Applicant</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                <KeyValue label="Full name">
                  {canSeeSensitive ? application.participant.fullName : <Restricted />}
                </KeyValue>
                <KeyValue label="Email">
                  {canSeeSensitive ? (
                    <a href={`mailto:${application.participant.email}`} className="link-underline text-brand-700">
                      {application.participant.email}
                    </a>
                  ) : (
                    <Restricted />
                  )}
                </KeyValue>
                <KeyValue label="Institution">
                  {canSeeSensitive ? (application.participant.institution ?? 'Not provided') : <Restricted />}
                </KeyValue>
                <KeyValue label="Country / region">
                  {canSeeSensitive ? (application.participant.country ?? application.participant.region ?? 'Not provided') : <Restricted />}
                </KeyValue>
                <KeyValue label="Time zone">{application.participant.timeZone ?? 'Not provided'}</KeyValue>
                <KeyValue label="Category">{application.participant.participantCategory ?? 'Not provided'}</KeyValue>
                <KeyValue label="Submitted">
                  {application.submittedAt ? formatDateTime(application.submittedAt, application.participant.timeZone) : 'Not submitted'}
                </KeyValue>
                <KeyValue label="Last updated">{formatDateTime(application.updatedAt)}</KeyValue>
              </dl>
              {!canSeeSensitive ? (
                <p className="mt-4 text-xs leading-relaxed meta">
                  Contact details are withheld for your role. Decisions you record are still fully attributed.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Committee preferences</CardTitle>
            </CardHeader>
            <CardBody>
              {application.preferences.length ? (
                <ol className="space-y-3">
                  {application.preferences.map((preference) => (
                    <li key={preference.id} className="text-sm">
                      <span className="font-mono text-2xs meta">#{preference.rank}</span>{' '}
                      <span className="text-ink-800">{preference.committee.name ?? 'Name to be confirmed'}</span>
                      {preference.note ? <p className="text-xs meta">{preference.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm meta">No preferences recorded.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <CreditCard className="size-4 meta" aria-hidden="true" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {application.payments.length ? (
                <ul className="space-y-3">
                  {application.payments.map((payment) => {
                    const paymentMeta = PAYMENT_STATUS_META[payment.status as keyof typeof PAYMENT_STATUS_META]
                    return (
                      <li key={payment.id} className="space-y-1 border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={paymentMeta?.tone === 'positive' ? 'positive' : paymentMeta?.tone === 'negative' ? 'negative' : 'outline'}>
                            {paymentMeta?.label ?? payment.status}
                          </Badge>
                          <span className="text-sm text-ink-800">
                            {formatMoney(payment.amountMinor, payment.currency) ?? (
                              <span className="font-mono text-xs text-warning-700">[AMOUNT — TBD]</span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs meta">
                          {payment.provider ?? 'provider unknown'} · recorded {formatDateTime(payment.createdAt)}
                          {payment.verifiedAt ? ` · verified ${formatDateTime(payment.verifiedAt)}` : ''}
                        </p>
                        {payment.actions.length ? (
                          <ul className="text-xs meta">
                            {payment.actions.map((action) => (
                              <li key={action.id}>
                                {action.action.replace(/_/g, ' ')} · {action.actor?.name ?? 'system'} · {formatDateTime(action.createdAt)}
                                {action.note ? ` · ${action.note}` : ''}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm meta">
                  No payment has been recorded. Checkout stays disabled until a provider is configured.
                </p>
              )}

              {can(PERMISSIONS.paymentsManage) ? (
                <ActionForm action={recordManualPayment} submitLabel="Record payment" submitVariant="secondary" submitSize="sm">
                  <input type="hidden" name="applicationId" value={application.id} />
                  <Field label="Amount" required hint="Major units, e.g. 2500.00">
                    <Input name="amountMajor" type="number" step="0.01" min="0" required />
                  </Field>
                  <Field label="Currency" required hint="Three-letter code, e.g. INR, USD">
                    <Input name="currency" maxLength={8} required placeholder="INR" className="uppercase" />
                  </Field>
                  <Field label="Result" required>
                    <NativeSelect name="status" defaultValue="manually_verified">
                      <option value="manually_verified">Verified manually (bank / transfer record seen)</option>
                      <option value="succeeded">Paid (provider-confirmed)</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Note" hint="What did you check, and where? This is the reconciliation trail.">
                    <Input name="note" maxLength={400} />
                  </Field>
                </ActionForm>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <MessageSquare className="size-4 meta" aria-hidden="true" />
                Communications
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {application.communications.length ? (
                <ul className="space-y-3">
                  {application.communications.map((recipient) => (
                    <li key={recipient.id} className="text-sm">
                      <span className="text-ink-800">{recipient.communication.subject}</span>
                      <p className="text-xs meta">
                        {recipient.status} · queued {formatDateTime(recipient.createdAt)}
                        {recipient.sentAt ? ` · sent ${formatDateTime(recipient.sentAt)}` : ''}
                      </p>
                      {recipient.error ? <p className="text-xs text-danger-700">{recipient.error}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm meta">No messages have been sent to this applicant yet.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Mail className="size-4 meta" aria-hidden="true" />
                Consents
              </CardTitle>
            </CardHeader>
            <CardBody>
              {application.consents.length ? (
                <ul className="space-y-2 text-sm">
                  {application.consents.map((consent) => (
                    <li key={consent.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/policies/${consent.policySlug}`} className="link-underline text-ink-800">
                        {consent.policySlug.replace(/-/g, ' ')}
                      </Link>
                      <Badge tone={consent.granted && !consent.revokedAt ? 'positive' : 'neutral'}>
                        {consent.granted && !consent.revokedAt ? 'Granted' : 'Withdrawn'}
                      </Badge>
                      <span className="text-xs meta">
                        {consent.version ? `v${consent.version} · ` : ''}
                        {consent.grantedAt ? formatDateTime(consent.grantedAt) : 'no timestamp'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm meta">No consent records.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2 text-xs leading-relaxed meta">
              <p className="flex items-center gap-2 font-medium text-ink-700">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Application created {formatDateTime(application.createdAt)}
              </p>
              <p>
                Deleting applications is deliberately not offered. Withdrawal, cancellation and declined statuses preserve
                the record a participant may later ask about.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Restricted() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs meta">
      <Lock className="size-3" aria-hidden="true" />
      Restricted for your role
    </span>
  )
}

function safeParse(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function applicationPreferences(preferences: { rank: number; committee: { name: string | null } }[]) {
  return preferences.reduce<Record<string, string>>((accumulator, preference) => {
    accumulator[`Preference ${preference.rank}`] = preference.committee.name ?? '[COMMITTEE NAME — TBD]'
    return accumulator
  }, {})
}
