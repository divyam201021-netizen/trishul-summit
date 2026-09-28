import Link from 'next/link'
import type { Metadata } from 'next'
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { adminSignOut } from '@/lib/auth/actions'
import { getEventConfig } from '@/lib/config'
import { mailConfigured, mailStatusLabel } from '@/lib/mail/transport'
import { providerStatus } from '@/lib/payments'
import { cn } from '@/lib/utils'
import { SideNav } from '@/components/site/side-nav'
import { ADMIN_NAV } from '@/components/site/nav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { PageViewTracker } from '@/components/site/reveal'

/**
 * Organizer workspace shell.
 *
 * Authorization happens here, once, for the whole subtree — and again inside
 * every server action and query. Hiding a navigation item is never the security
 * boundary: it is only there so a reviewer is not shown tools they cannot use.
 *
 * The chrome deliberately exposes environment honesty: whether mail is actually
 * being delivered and whether a payment provider is configured. An organizer
 * should never have to guess either.
 */
export const metadata: Metadata = {
  title: 'Organizer workspace',
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  const config = await getEventConfig()
  const payment = providerStatus()

  const nav = ADMIN_NAV.filter(
    (item) => !item.permission || hasPermission(admin.permissions, item.permission as Permission),
  )
  const mail = mailStatusLabel()
  const mailLive = mailConfigured()

  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunk/50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-950 text-ink-100">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="font-display text-sm tracking-[0.16em] uppercase">
              {config.text('identity.wordmark') ?? 'TRISHUL SUMMIT'}
            </Link>
            <span className="hidden font-mono text-2xs tracking-[0.12em] text-ink-400 uppercase sm:inline">
              Organizer workspace
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 text-xs text-ink-300 md:flex">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {admin.name} · {admin.roleName}
              {admin.mfaEnabled ? <Badge tone="dark">MFA</Badge> : null}
            </span>
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-xs text-ink-300 transition-colors hover:text-white sm:flex"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              View public site
            </Link>
            <form action={adminSignOut}>
              <Button type="submit" variant="onDark" size="sm">
                <LogOut className="size-3.5" aria-hidden="true" />
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ink-950/80">
          <div className="shell flex flex-wrap items-center gap-x-6 gap-y-1 py-2 text-2xs text-ink-400">
            <span className="flex items-center gap-1.5">
              Mail transport:
              <span className={cn('font-medium', mailLive ? 'text-success-100' : 'text-warning-100')}>{mail}</span>
            </span>
            <span className="flex items-center gap-1.5">
              Payments:
              {payment.configured ? (
                <span className="font-medium text-success-100">{payment.label}</span>
              ) : (
                <span className="font-mono text-warning-100">[PAYMENT DETAILS — TBD]</span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              Event date:
              {config.text('event.dateSummary') ? (
                <span className="text-ink-200">{config.text('event.dateSummary')}</span>
              ) : (
                <span className="font-mono text-warning-100">[EVENT DATE — TBD]</span>
              )}
            </span>
          </div>
        </div>
      </header>

      <div className="shell w-full flex-1 py-5 sm:py-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <div className="lg:pt-1">
          <SideNav items={nav} label="Organizer workspace sections" />
          <div className="mt-6 hidden rounded-lg border border-ink-200 bg-paper p-4 text-xs leading-relaxed meta lg:block">
            <p className="font-medium text-ink-700">Every action is audited</p>
            <p className="mt-1.5">
              Status changes, allocations, payment records and messages are written to the audit log with your name and
              the time. Applicant data is never exported automatically.
            </p>
          </div>
        </div>
        <main id="main" className="mt-5 min-w-0 lg:mt-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-ink-200 bg-paper">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-5 text-xs meta">
          <p>
            Private workspace. Applicant personal data must not be copied into shared documents, chat tools or exports
            outside the organizing committee.
          </p>
          <p className="flex flex-wrap gap-4">
            {config.text('contact.pressEmail') ? <span>Press: {config.text('contact.pressEmail')}</span> : null}
            <Link href="/admin/audit" className="link-underline text-brand-700">
              Audit log
            </Link>
            <Link href="/accessibility" className="link-underline text-brand-700">
              Accessibility
            </Link>
          </p>
        </div>
      </footer>

      <PageViewTracker surface="admin" />
    </div>
  )
}
