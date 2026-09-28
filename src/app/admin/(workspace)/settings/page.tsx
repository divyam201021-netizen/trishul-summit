import Link from 'next/link'
import { CreditCard, Mail, Palette, TriangleAlert } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { getEventConfig, brandColorStyle } from '@/lib/config'
import { mailConfigured, mailStatusLabel } from '@/lib/mail/transport'
import { providerStatus } from '@/lib/payments'
import { testMailTransport } from '@/lib/admin/actions'
import { Alert, Card, CardBody, CardHeader, CardTitle, SectionHeading } from '@/components/ui/primitives'
import { ActionForm } from '@/components/ui/action-form'
import { SettingsEditor, SettingsPlaceholderNotice } from '@/components/admin/settings-editor'
import { Tbd } from '@/components/ui/placeholder'

/**
 * Event settings.
 *
 * This is the screen that replaces the entire site's content without touching
 * code: dates, time zone, eligibility, fees, platform and contact details all
 * live in the configuration registry. The brand colour is applied at runtime by
 * generating a full token ramp from one hex value.
 */
export default async function AdminSettingsPage() {
  await requireAdmin(PERMISSIONS.settingsManage)
  const config = await getEventConfig()
  const brandColor = config.text('identity.brandColor')
  const brandStyle = brandColorStyle(brandColor)
  const payment = providerStatus()
  const mailLive = mailConfigured()

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Configuration"
        title="Event settings"
        description="Every fact about the summit lives here. Change a value once and it updates everywhere — public pages, registration, emails and the participant portal."
      />

      <SettingsPlaceholderNotice />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SettingsEditor
            config={config}
            groupKeys={['identity', 'event', 'registration']}
            title="Identity, dates & registration"
            description="Who the summit is, when it happens, who may attend, and when registration opens and closes."
          />

          <SettingsEditor
            config={config}
            groupKeys={['fees', 'platform', 'contact']}
            title="Fees, platform & contact"
            description="Fee and refund information, where the summit runs, and how participants reach the organizing committee."
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Palette className="size-4 meta" aria-hidden="true" />
                Brand colour
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-600">
                One hex value generates the full brand ramp used across the platform, so rebranding does not require a
                deployment or a redesign.
              </p>
              {brandColor && brandStyle ? (
                <div className="space-y-3">
                  <p className="font-mono text-xs text-ink-700">{brandColor}</p>
                  <div className="flex overflow-hidden rounded-md border border-ink-200">
                    {['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map((step) => (
                      <span
                        key={step}
                        aria-hidden="true"
                        className="h-8 flex-1"
                        style={{ backgroundColor: `var(--brand-${step})` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs meta">
                    Contrast is checked against the paper background: body text uses the ink ramp, so a light brand colour
                    can never silently make text unreadable.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-600">
                  Default neutral brand applied. Set <Tbd label="PRIMARY BRAND COLOR" /> above to see the ramp.
                </p>
              )}
              <p className="text-xs meta">
                Accepted as a 6-digit hex value, e.g. <span className="font-mono">#3746A6</span>.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Mail className="size-4 meta" aria-hidden="true" />
                Email delivery
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-600">
                Status: <span className={mailLive ? 'font-medium text-success-700' : 'font-medium text-warning-700'}>{mailStatusLabel()}</span>
              </p>
              <p className="text-sm leading-relaxed text-ink-600">
                With no transport configured, every message is written to the delivery log with status “queued”. Nothing is
                silently dropped, but nothing is delivered either — configure <span className="font-mono text-xs">MAIL_TRANSPORT</span>,{' '}
                <span className="font-mono text-xs">SMTP_HOST</span>, <span className="font-mono text-xs">SMTP_USER</span> and{' '}
                <span className="font-mono text-xs">SMTP_PASSWORD</span> in the environment to enable delivery.
              </p>
              <ActionForm action={testMailTransport} submitLabel="Send a test message" submitVariant="secondary" submitSize="sm" />
              <p className="text-xs meta">
                The test is recorded in the delivery log like any other message, so you can confirm the outcome rather than
                trust a success message.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <CreditCard className="size-4 meta" aria-hidden="true" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              {payment.configured ? (
                <Alert tone="success" title={`Provider configured: ${payment.label}`}>
                  Checkout is enabled through the provider adapter. Card details are handled entirely by the provider.
                </Alert>
              ) : (
                <>
                  <p>
                    Payment is <strong className="font-medium text-ink-800">not configured</strong>. Checkout stays
                    disabled, registration never asks for money, and participants see{' '}
                    <span className="font-mono text-xs">[PAYMENT DETAILS — TBD]</span>.
                  </p>
                  <p>
                    To enable it: set <span className="font-mono text-xs">PAYMENT_PROVIDER</span> and{' '}
                    <span className="font-mono text-xs">PAYMENT_SECRET_KEY</span>, register a provider adapter, and fill in
                    the fee, currency, payment method and refund policy fields above. Payment stays off until all of those
                    exist — a half-configured checkout is worse than none.
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2 text-xs leading-relaxed meta">
              <p className="flex items-center gap-2 font-medium text-ink-700">
                <TriangleAlert className="size-3.5" aria-hidden="true" />
                Honest defaults
              </p>
              <p>
                There is no “fill with sample data” button, and there never will be. Sample dates and fees have a habit of
                surviving into production. If you want to see how the site reads with content, add your approved copy to
                the Content section instead.
              </p>
              <p>
                Content that is editorial rather than factual — narrative copy, FAQ, policies, announcements — lives under{' '}
                <Link href="/admin/content" className="underline underline-offset-2">
                  Content
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
