import Link from 'next/link'
import { History, Inbox, Mail, Megaphone } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/client'
import { listCommittees } from '@/lib/content/queries'
import { EMAIL_TEMPLATES } from '@/lib/mail/templates'
import { mailConfigured, mailStatusLabel } from '@/lib/mail/transport'
import { publishAnnouncement } from '@/lib/admin/actions'
import { APPLICATION_STATUSES, statusMeta } from '@/lib/registration/status'
import { formatDateTime, pluralize } from '@/lib/utils'
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
  Stat,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm } from '@/components/ui/action-form'
import { PendingContent } from '@/components/ui/placeholder'
import { BroadcastComposer } from '@/components/admin/broadcast-composer'

/**
 * Communications.
 *
 * Three separate concerns, kept visually distinct so they are never confused:
 * announcements (published inside the portal), broadcasts (email), and the
 * delivery log (what the transport actually did). Templates carry tokens, and
 * unresolved tokens are reported rather than filled with invented values.
 */
export default async function AdminCommunicationsPage() {
  await requireAdmin(PERMISSIONS.communicationsSend)
  const [announcements, communications, delivery, committees] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
    prisma.communication.findMany({ orderBy: { createdAt: 'desc' }, take: 15, include: { createdBy: { select: { name: true } } } }),
    prisma.emailMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
    listCommittees(),
  ])

  const mailLive = mailConfigured()
  const queued = delivery.filter((message) => message.status === 'queued').length
  const failed = delivery.filter((message) => message.status === 'failed').length

  const audiences = [
    { value: 'all', label: 'Everyone with a submitted application' },
    ...APPLICATION_STATUSES.filter((status) => status !== 'DRAFT').map((status) => ({
      value: `status:${status}`,
      label: `Status: ${statusMeta(status).label}`,
    })),
    ...committees.map((committee) => ({
      value: `committee:${committee.id}`,
      label: `Committee: ${committee.name ?? `Placeholder ${committee.displayOrder + 1}`} (accepted & confirmed)`,
    })),
    { value: 'marketing_optin', label: 'Marketing: participants who opted in to optional updates' },
  ]

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Communications"
        title="Announcements & participant messaging"
        description="What participants see inside the portal, and what lands in their inbox — with a delivery log for every attempt."
      />

      {!mailLive ? (
        <Alert tone="warning" title={`Email delivery is not configured — ${mailStatusLabel()}`}>
          Messages composed here are stored with status “queued” and are not delivered. Transactional mail matters most:
          confirmation, allocation and joining instructions all depend on it. Configure SMTP before opening registration
          publicly.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Announcements" value={announcements.length} hint="Published or drafted in the portal." />
        <Stat label="Broadcasts" value={communications.length} hint="Most recent 15 shown below." />
        <Stat label="Messages queued" value={queued} hint="Recorded but not delivered." />
        <Stat label="Messages failed" value={failed} hint="Investigate before resending." />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <BroadcastComposer
            templates={EMAIL_TEMPLATES.map((template) => ({
              key: template.key,
              name: template.name,
              kind: template.kind,
              subject: template.subject,
              body: template.body,
              description: template.description,
              audience: template.audience,
            }))}
            audiences={audiences}
            mailLive={mailLive}
            defaultAudience="all"
          />

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <History className="size-4 meta" aria-hidden="true" />
                Broadcast history
              </CardTitle>
            </CardHeader>
            <CardBody>
              {communications.length ? (
                <TableWrap className="border-0">
                  <caption className="sr-only">Recent broadcasts with audience, counts and sender</caption>
                  <thead>
                    <tr>
                      <Th>Subject</Th>
                      <Th>Audience</Th>
                      <Th>Recipients</Th>
                      <Th>Status</Th>
                      <Th>Sent</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {communications.map((communication) => (
                      <tr key={communication.id}>
                        <Td>
                          <span className="block text-ink-900">{communication.subject}</span>
                          <span className="block font-mono text-2xs meta">{communication.templateKey}</span>
                        </Td>
                        <Td className="text-xs">{communication.audience}</Td>
                        <Td className="text-xs tabular-nums">
                          {communication.sentCount}/{communication.recipientCount}
                          {communication.failedCount ? (
                            <span className="text-danger-700"> · {communication.failedCount} failed</span>
                          ) : null}
                        </Td>
                        <Td>
                          <Badge tone={communication.status === 'failed' ? 'negative' : communication.status === 'sent' ? 'positive' : 'outline'}>
                            {communication.status}
                          </Badge>
                        </Td>
                        <Td className="text-xs meta">
                          {communication.sentAt ? formatDateTime(communication.sentAt) : '—'}
                          {communication.createdBy?.name ? ` · ${communication.createdBy.name}` : ''}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              ) : (
                <EmptyState
                  icon={<EMPTY_STATE_ICONS.noAnnouncements className="size-5" aria-hidden="true" />}
                  title="No broadcasts yet"
                  description="Nothing has been sent to participants. When you send the first message, its audience, counts and sender appear here."
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Inbox className="size-4 meta" aria-hidden="true" />
                Delivery log
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-600">
                Every send attempt — transactional or bulk — is recorded here with its transport and outcome, so “did they
                get the email?” has an answer that does not rely on memory.
              </p>
              {delivery.length ? (
                <ul className="divide-y divide-ink-100">
                  {delivery.map((message) => (
                    <li key={message.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block text-ink-800">{message.subject}</span>
                        <span className="block text-xs meta">
                          {message.to} · {message.templateKey} · transport {message.transport ?? 'none'}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={message.status === 'sent' ? 'positive' : message.status === 'failed' ? 'negative' : 'warning'}>
                          {message.status}
                        </Badge>
                        <span className="text-xs meta">{formatDateTime(message.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm meta">No messages have been recorded yet.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Megaphone className="size-4 meta" aria-hidden="true" />
                Publish an announcement
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ActionForm action={publishAnnouncement} submitLabel="Publish announcement" submitVariant="brand" submitSize="sm" resetOnSuccess>
                <Field label="Title" required>
                  <Input name="title" maxLength={200} required />
                </Field>
                <Field label="Body" hint="Plain text. Keep it short — this appears in the participant portal.">
                  <Textarea name="body" rows={4} maxLength={4000} />
                </Field>
                <Field label="Severity" required hint="Only use “critical” for genuine disruption.">
                  <NativeSelect name="severity" defaultValue="info">
                    <option value="info">Information</option>
                    <option value="important">Important</option>
                    <option value="critical">Critical</option>
                  </NativeSelect>
                </Field>
                <Field label="Audience" required>
                  <NativeSelect name="audience" defaultValue="participants">
                    <option value="participants">Participants (portal only)</option>
                    <option value="public">Public site banner</option>
                    <option value="admins">Organizers</option>
                  </NativeSelect>
                </Field>
                <Field label="Publish" hint="Leave unticked to save it as a draft.">
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input type="checkbox" name="publishNow" className="size-4 rounded border-ink-400" />
                    Publish immediately
                  </label>
                </Field>
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Recent announcements</CardTitle>
            </CardHeader>
            <CardBody>
              {announcements.length ? (
                <ul className="space-y-3">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink-900">{announcement.title}</span>
                        <Badge tone={announcement.severity === 'critical' ? 'negative' : announcement.severity === 'important' ? 'warning' : 'outline'}>
                          {announcement.severity}
                        </Badge>
                        <Badge tone="outline">{announcement.audience}</Badge>
                      </div>
                      <p className="mt-1 text-xs meta">
                        {announcement.publishedAt ? `Published ${formatDateTime(announcement.publishedAt)}` : 'Draft — not visible to anyone'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm meta">No announcements yet.</p>
              )}
            </CardBody>
          </Card>

          <PendingContent title="Marketing consent is enforced, not assumed">
            Messages marked as marketing are only counted for participants with a granted, unrevoked opt-in. Withdrawals
            take effect immediately, and the consent record with its timestamp is kept.
          </PendingContent>

          <Card>
            <CardBody className="space-y-2 text-xs leading-relaxed meta">
              <p className="flex items-center gap-2 font-medium text-ink-700">
                <Mail className="size-3.5" aria-hidden="true" />
                {pluralize(delivery.length, 'message')} in the log
              </p>
              <p>
                The log stores the recipient address because delivery requires it. It is never used for analytics and never
                exposed to participants. See the{' '}
                <Link href="/policies/privacy-notice" className="underline underline-offset-2">
                  Privacy Notice
                </Link>
                .
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
