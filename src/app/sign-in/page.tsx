import Link from 'next/link'
import { ArrowRight, Inbox } from 'lucide-react'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { getCurrentParticipant } from '@/lib/auth/session'
import { participantSignIn } from '@/lib/auth/actions'
import { safeRedirectPath } from '@/lib/security/redirect'
import { Alert } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Sign in',
    description: 'Sign in to view your Trishul Summit application, allocation and preparation information.',
    path: '/sign-in',
    // A private, session-bound surface: never indexed.
    noindex: true,
  })
}

export default async function ParticipantSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>
}) {
  const [params, participant] = await Promise.all([searchParams, getCurrentParticipant()])
  const next = safeRedirectPath(params.next, '/portal')

  if (participant) {
    return (
      <AuthShell
        eyebrow="Already signed in"
        title={`Welcome back, ${participant.fullName.split(' ')[0] ?? participant.fullName}`}
        description="You are signed in on this device. Continue to your participant portal to see your application, allocation and preparation information."
      >
        <div className="space-y-4">
          <LinkButton href="/portal" variant="brand" size="lg" block>
            Go to my portal
            <ArrowRight className="size-4" aria-hidden="true" />
          </LinkButton>
          <p className="text-center text-xs meta">
            Signed in as {participant.email}. To use a different account, sign out from the portal first.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="My registration"
      title="Sign in to your application"
      description={
        <>
          Your account is created when you register. Signing in shows your application status, your committee allocation
          once it is released, the schedule and your preparation information.
        </>
      }
      footer={
        <p className="text-xs leading-relaxed meta">
          Your application reference is a private identifier. It is never placed in a URL, never sent to analytics and
          never shown on a public page — if you receive a message asking for it, treat it as suspicious and{' '}
          <Link href="/contact" className="link-underline text-brand-700">
            report it to the organizing committee
          </Link>
          .
        </p>
      }
    >
      <div className="space-y-5">
        {params.status === 'signed-out' ? (
          <Alert tone="success" title="You have been signed out">
            Your session was ended on this device.
          </Alert>
        ) : null}

        {params.status === 'session-ended' ? (
          <Alert tone="warning" title="Your session ended">
            For your security the session expired. Sign in again to continue where you left off.
          </Alert>
        ) : null}

        <SignInForm action={participantSignIn} kind="participant" next={next} />

        <div className="rounded-lg border border-dashed border-ink-300 bg-paper-sunk/60 p-4 text-xs leading-relaxed text-ink-600">
          <p className="flex items-center gap-2 font-medium text-ink-700">
            <Inbox className="size-3.5" aria-hidden="true" />
            Started an application and stopped?
          </p>
          <p className="mt-1.5">
            Your draft is saved against your email address the moment you complete the first step. Sign in and{' '}
            <Link href="/register" className="link-underline text-brand-700">
              resume registration
            </Link>{' '}
            — you will not lose what you already entered.
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
