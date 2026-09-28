import Link from 'next/link'
import type { Metadata } from 'next'
import { CircleHelp, LogOut } from 'lucide-react'
import { requireParticipant } from '@/lib/auth/guards'
import { brandProps, getEventConfig } from '@/lib/config'
import { getParticipantApplication } from '@/lib/applications/queries'
import { participantSignOut } from '@/lib/auth/actions'
import { SideNav } from '@/components/site/side-nav'
import { Logo } from '@/components/site/logo'
import { PORTAL_NAV } from '@/components/site/nav'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/primitives'
import { PageViewTracker } from '@/components/site/reveal'

/**
 * Participant portal shell.
 *
 * The guard runs in the layout so every nested route is protected by
 * construction, not by remembering to add a check to each page. The layout also
 * exposes the application status in the header chrome: a participant should
 * never have to open a page to know where their application stands.
 *
 * `noindex` is set here and again as an HTTP header in next.config.ts.
 */
export const metadata: Metadata = {
  title: 'My registration',
  robots: { index: false, follow: false, nocache: true },
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const participant = await requireParticipant('/portal')
  const [config, application] = await Promise.all([
    getEventConfig(),
    getParticipantApplication(participant.id),
  ])
  const supportEmail = config.text('contact.supportEmail')

  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunk/50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-paper/95 backdrop-blur-sm">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo {...brandProps(config)} />
            <span className="hidden font-mono text-2xs tracking-[0.12em] meta uppercase sm:inline">
              Participant portal
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {application ? <StatusBadge status={application.status} className="hidden sm:inline-flex" /> : null}
            <span className="hidden max-w-[12rem] truncate text-sm text-ink-700 md:inline">{participant.fullName}</span>
            <Link
              href="/"
              className="hidden text-sm text-ink-600 transition-colors hover:text-ink-900 lg:inline"
            >
              Summit site
            </Link>
            <form action={participantSignOut}>
              <Button type="submit" variant="secondary" size="sm">
                <LogOut className="size-3.5" aria-hidden="true" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="shell w-full flex-1 py-5 sm:py-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <div className="lg:pt-1">
          <SideNav items={PORTAL_NAV} label="Participant portal sections" />
        </div>
        <main id="main" className="mt-5 min-w-0 lg:mt-0">
          {children}
        </main>
      </div>

      <footer className="border-t border-ink-200 bg-paper">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-5 text-xs meta">
          <p>
            This portal is private to you. Your application reference is never shown on public pages and never sent to
            analytics.
          </p>
          <p className="flex flex-wrap items-center gap-3">
            <Link href="/portal/support" className="link-underline inline-flex items-center gap-1.5 text-brand-700">
              <CircleHelp className="size-3.5" aria-hidden="true" />
              Get support
            </Link>
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="link-underline text-brand-700">
                {supportEmail}
              </a>
            ) : null}
            <Link href="/policies/privacy-notice" className="link-underline text-brand-700">
              Privacy
            </Link>
          </p>
        </div>
      </footer>

      <PageViewTracker surface="portal" />
    </div>
  )
}
