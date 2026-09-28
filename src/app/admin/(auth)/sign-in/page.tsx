import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getCurrentAdmin } from '@/lib/auth/session'
import { adminSignIn } from '@/lib/auth/actions'
import { safeRedirectPath } from '@/lib/security/redirect'
import { Alert, Badge } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Organizer sign-in',
    description: 'Restricted sign-in for the Trishul Summit organizing committee workspace.',
    path: '/admin/sign-in',
    noindex: true,
  })
}

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>
}) {
  const [params, admin] = await Promise.all([searchParams, getCurrentAdmin()])
  const next = safeRedirectPath(params.next, '/admin')

  if (admin) {
    return (
      <AuthShell
        eyebrow="Organizer workspace"
        title={`Signed in as ${admin.name}`}
        description={
          <>
            Your role is <strong className="font-medium text-ink-800">{admin.roleName}</strong>. Every change you make in
            the workspace is recorded in the audit log with your name and the time it happened.
          </>
        }
      >
        <div className="space-y-4">
          <LinkButton href="/admin" variant="primary" size="lg" block>
            Open the workspace
            <ArrowRight className="size-4" aria-hidden="true" />
          </LinkButton>
          <p className="text-center text-xs meta">
            {admin.mfaEnabled ? 'Multi-factor authentication is enabled on this account.' : 'Multi-factor authentication is not enabled on this account yet.'}
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Restricted area"
      title="Organizer sign-in"
      description={
        <>
          This workspace holds applicant personal data. Access is limited to the organizing committee, checked
          server-side against your role, and every action is audited.
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="outline" icon={<ShieldAlert className="size-3" aria-hidden="true" />}>
            Audited actions
          </Badge>
          <span className="text-xs meta">
            Not a member of the organizing committee?{' '}
            <Link href="/sign-in" className="link-underline text-brand-700">
              Participant sign-in
            </Link>
          </span>
        </div>
      }
    >
      <div className="space-y-5">
        {params.status === 'signed-out' ? (
          <Alert tone="success" title="You have been signed out">
            Your organizer session was ended on this device.
          </Alert>
        ) : null}

        <SignInForm action={adminSignIn} kind="admin" next={next} />

        <p className="text-xs leading-relaxed meta">
          Accounts lock temporarily after five failed attempts. If you are locked out or have lost access to your
          authenticator, ask a director to reset your access from the staff screen.
        </p>
      </div>
    </AuthShell>
  )
}
