'use client'

import { useMemo, useState, useTransition } from 'react'
import { Eye, Send, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/primitives'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CheckboxField, Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { PendingContent } from '@/components/ui/placeholder'
import { previewCommunication, sendCommunication } from '@/lib/admin/actions'
import { idleState } from '@/lib/security/validation'

export interface ComposerTemplate {
  key: string
  name: string
  kind: 'transactional' | 'marketing'
  subject: string
  body: string
  description: string
  audience: string
}

export interface ComposerAudience {
  value: string
  label: string
}

/**
 * Broadcast composer.
 *
 * Two deliberate safety properties:
 *  • the message body is rendered with its real variables before sending, and
 *    any token that cannot be resolved is surfaced as a warning rather than
 *    being quietly replaced with an empty string;
 *  • sending requires an explicit confirmation that names the audience size,
 *    because a bulk send cannot be recalled.
 */
export function BroadcastComposer({
  templates,
  audiences,
  mailLive,
  defaultAudience,
}: {
  templates: ComposerTemplate[]
  audiences: ComposerAudience[]
  mailLive: boolean
  defaultAudience: string
}) {
  const first = templates[0]
  const [templateKey, setTemplateKey] = useState(first?.key ?? '')
  const [subject, setSubject] = useState(first?.subject ?? '')
  const [body, setBody] = useState(first?.body ?? '')
  const [kind, setKind] = useState<'transactional' | 'marketing'>(first?.kind ?? 'transactional')
  const [audience, setAudience] = useState(first?.audience ?? defaultAudience)
  const [confirmed, setConfirmed] = useState(false)
  const [preview, setPreview] = useState<{ body: string; recipients: number; unresolved: string | null } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, startTransition] = useTransition()
  const { toast } = useToast()

  const selected = useMemo(() => templates.find((template) => template.key === templateKey), [templates, templateKey])
  const audienceLabel = audiences.find((option) => option.value === audience)?.label ?? audience

  function applyTemplate(key: string) {
    const template = templates.find((item) => item.key === key)
    setTemplateKey(key)
    if (!template) return
    setSubject(template.subject)
    setBody(template.body)
    setKind(template.kind)
    setAudience(template.audience)
    setPreview(null)
    setConfirmed(false)
  }

  function buildFormData(extra?: Record<string, string>) {
    const formData = new FormData()
    formData.set('templateKey', templateKey)
    formData.set('subject', subject)
    formData.set('body', body)
    formData.set('audience', audience)
    formData.set('kind', kind)
    for (const [key, value] of Object.entries(extra ?? {})) formData.set(key, value)
    return formData
  }

  function runPreview() {
    startTransition(async () => {
      const result = await previewCommunication(idleState, buildFormData())
      if (!result.ok) {
        setPreview(null)
        toast({ title: 'Preview failed', description: result.message, tone: 'error' })
        return
      }
      setPreview({
        body: String(result.data?.previewBody ?? ''),
        recipients: Number(result.data?.recipients ?? 0),
        unresolved: result.data?.unresolvedTokens ? String(result.data.unresolvedTokens) : null,
      })
    })
  }

  function runSend() {
    startTransition(async () => {
      const result = await sendCommunication(idleState, buildFormData({ confirmSend: 'on' }))
      setConfirmOpen(false)
      toast({
        title: result.ok ? 'Messages queued' : 'Nothing was sent',
        description: result.message,
        tone: result.ok ? 'success' : 'error',
      })
      if (result.ok) {
        setConfirmed(false)
        setPreview(null)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Send className="size-4 meta" aria-hidden="true" />
          Send a message
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {!mailLive ? (
          <PendingContent title="No mail transport is configured" tone="warning">
            Messages will be recorded in the delivery log with status “queued” instead of being delivered. Configure SMTP
            before relying on email to reach participants.
          </PendingContent>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Field label="Template" hint="Selecting a template fills the subject, body and the suggested audience.">
              <NativeSelect value={templateKey} onChange={(event) => applyTemplate(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {selected ? <p className="text-xs leading-relaxed meta">{selected.description}</p> : null}

            <Field label="Audience" required hint="Counted server-side at send time — this list is live.">
              <NativeSelect value={audience} onChange={(event) => setAudience(event.target.value)} required>
                {audiences.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              label="Message type"
              required
              hint="Marketing messages are only sent to participants who opted in and can be withdrawn at any time."
            >
              <NativeSelect value={kind} onChange={(event) => setKind(event.target.value as 'transactional' | 'marketing')}>
                <option value="transactional">Transactional — part of taking part</option>
                <option value="marketing">Marketing — optional updates only</option>
              </NativeSelect>
            </Field>

            <Field label="Subject" required>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required />
            </Field>

            <Field
              label="Body"
              required
              hint="Tokens such as [PARTICIPANT NAME] are replaced per recipient. Anything that cannot be resolved is reported instead of being guessed."
            >
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} maxLength={10000} className="font-mono text-xs" />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={runPreview} loading={busy && !confirmOpen} loadingLabel="Rendering…">
                <Eye className="size-4" aria-hidden="true" />
                Preview with real variables
              </Button>
              <Button type="button" variant="brand" onClick={() => setConfirmOpen(true)} disabled={!confirmed || busy}>
                <Send className="size-4" aria-hidden="true" />
                Send
              </Button>
            </div>

            <CheckboxField
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
              label="I have previewed this message and confirm it should be sent"
              description="Bulk sends cannot be recalled. The recipient count, audience and your name are recorded in the audit log."
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-ink-200 bg-paper-sunk/60 p-4">
              <p className="eyebrow meta">Preview</p>
              {preview ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-ink-700">
                    {preview.recipients === 0
                      ? 'That audience currently contains no participants.'
                      : `This will go to ${preview.recipients} recipient(s).`}
                  </p>
                  {preview.unresolved ? (
                    <Alert tone="warning" title="Unresolved tokens in this message">
                      <span className="font-mono text-xs">{preview.unresolved}</span>
                      <p className="mt-1">
                        These values are not configured yet, so recipients would see the token itself. Fill in the matching
                        setting under Settings, or remove the token from the body.
                      </p>
                    </Alert>
                  ) : null}
                  <pre className="max-h-[28rem] overflow-auto rounded-md border border-ink-200 bg-paper p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-800">
                    {preview.body}
                  </pre>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  Render this message with a real recipient&apos;s data before sending. Nothing is sent from the preview.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-ink-300 bg-paper-sunk/40 p-4 text-xs leading-relaxed text-ink-600">
              <p className="flex items-center gap-2 font-medium text-ink-700">
                <TriangleAlert className="size-3.5" aria-hidden="true" />
                What the platform will not do
              </p>
              <ul className="mt-2 space-y-1.5">
                <li>It will not send to an address it cannot verify belongs to an application.</li>
                <li>It will not invent a date, fee or deadline inside a template token.</li>
                <li>It will not remove a participant from the opt-out list for marketing mail.</li>
              </ul>
            </div>
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent
            title="Send this message?"
            description={`Audience: ${audienceLabel}. Type: ${kind}.`}
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-700">
                Every recipient is written to the communication record with an individual delivery status. If the mail
                transport is not configured, messages will be stored as “queued” and not delivered.
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="brand" size="sm" loading={busy} loadingLabel="Sending…" onClick={runSend}>
                  Send now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardBody>
    </Card>
  )
}
