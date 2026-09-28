'use client'

import { useState, useTransition } from 'react'
import { BellRing, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/primitives'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CheckboxField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { setMarketingConsent, withdrawApplication } from '@/lib/registration/actions'

/**
 * Two participant-initiated actions that are not simple form posts: withdrawing
 * an application and changing optional marketing consent. Both call a server
 * action, report the outcome through a polite live region, and never rely on a
 * browser confirm() dialog.
 */
export function ApplicationControls({
  canWithdraw,
  marketingConsent,
}: {
  canWithdraw: boolean
  marketingConsent: boolean
}) {
  return (
    <div className="space-y-6">
      <MarketingConsent initial={marketingConsent} />
      {canWithdraw ? <WithdrawApplication /> : null}
    </div>
  )
}

function MarketingConsent({ initial }: { initial: boolean }) {
  const [granted, setGranted] = useState(initial)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  function update(next: boolean) {
    // Optimistic, then reconciled with the server's answer.
    setGranted(next)
    startTransition(async () => {
      const result = await setMarketingConsent(next)
      if (!result.ok) {
        setGranted(!next)
        toast({ title: 'Not saved', description: result.message ?? 'Try again in a moment.', tone: 'error' })
        return
      }
      toast({ title: 'Preference saved', description: result.message, tone: 'success' })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <BellRing className="size-4 meta" aria-hidden="true" />
          Optional updates
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-600">
          Application and allocation emails are transactional — they are part of taking part and cannot be switched off.
          This setting only controls optional news, reminders and future-edition announcements.
        </p>
        <CheckboxField
          label="Send me optional news and updates about Trishul Summit"
          description="News, reminders about deadlines and announcements about future editions. Never shared with anyone outside the organizing committee."
          checked={granted}
          disabled={pending}
          onCheckedChange={(value) => update(value === true)}
        />
        <p className="text-sm text-ink-700" role="status" aria-live="polite">
          {granted ? 'You are opted in to optional updates.' : 'You are opted out of optional updates.'}
          {pending ? <span className="ml-2 text-xs meta">Saving…</span> : null}
        </p>
        <p className="text-xs leading-relaxed meta">
          You can change this at any time. Withdrawing consent is recorded with a timestamp, exactly like granting it.
        </p>
      </CardBody>
    </Card>
  )
}

function WithdrawApplication() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null)
  const { toast } = useToast()

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawApplication()
      setState(result)
      setOpen(false)
      toast({
        title: result.ok ? 'Application withdrawn' : 'Not withdrawn',
        description: result.message,
        tone: result.ok ? 'success' : 'error',
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-warning-600" aria-hidden="true" />
          Withdraw your application
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {state?.message ? (
          <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
        ) : (
          <p className="text-sm leading-relaxed text-ink-600">
            Withdrawing releases your place and removes you from review. Your record is kept so the organizing committee
            can answer questions later, and you can contact support if you would like to be considered again.
          </p>
        )}

        <Button type="button" variant="secondary" onClick={() => setOpen(true)} disabled={pending}>
          {pending ? 'Withdrawing…' : 'Withdraw application'}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            title="Withdraw this application?"
            description="This takes you out of review immediately. It is the one action in the portal that cannot be undone from here."
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-700">
                If you are withdrawing because something is unclear — dates, fees, committee allocation — contact support
                first. Most questions take one reply to answer.
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Keep my application
                </Button>
                <Button type="button" variant="destructive" size="sm" loading={pending} loadingLabel="Withdrawing…" onClick={withdraw}>
                  Withdraw application
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardBody>
    </Card>
  )
}
