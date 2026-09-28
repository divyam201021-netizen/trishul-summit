import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { PERMISSION_LABELS, type Permission } from '@/lib/auth/permissions'
import { Alert, Card, CardBody, CardHeader, CardTitle, SectionHeading } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'

/**
 * Denied access is explained, never vague.
 *
 * A dead end tells a reviewer nothing and encourages them to ask for
 * unnecessary access. This page states which role they hold, which destination
 * was refused, and who can change it.
 */
export default async function AdminForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; permission?: string }>
}) {
  const admin = await requireAdmin()
  const params = await searchParams

  const permission = params.permission && params.permission in PERMISSION_LABELS
    ? PERMISSION_LABELS[params.permission as Permission]
    : null

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Access denied"
        title="Your role does not include this area"
        description="Nothing is broken. This destination is restricted to roles that need it, and the check happens on the server — the page is not hidden from you, it is refused."
      />

      <Card>
        <CardBody className="space-y-4">
          <Alert tone="warning" title="What was refused">
            <p>
              You are signed in as <strong className="font-medium">{admin.roleName}</strong>.
              {params.from ? (
                <>
                  {' '}
                  The destination <span className="font-mono text-xs">{params.from}</span> was refused.
                </>
              ) : null}
              {permission ? (
                <>
                  {' '}
                  It requires the permission <strong className="font-medium">{permission}</strong>.
                </>
              ) : null}
            </p>
          </Alert>

          <p className="text-sm leading-relaxed text-ink-600">
            If you need this access to do your job, ask a director to change your role from the staff screen. Access changes
            take effect immediately and are recorded in the audit log with the name of the person who made them.
          </p>

          <div className="flex flex-wrap gap-3">
            <LinkButton href="/admin" variant="primary" size="sm">
              Back to the dashboard
            </LinkButton>
            <LinkButton href="/admin/staff" variant="secondary" size="sm">
              View your role
            </LinkButton>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <ShieldAlert className="size-4 meta" aria-hidden="true" />
            Permissions your account holds
          </CardTitle>
        </CardHeader>
        <CardBody>
          {admin.permissions.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {admin.permissions.map((permissionKey) => (
                <li key={permissionKey} className="flex items-start gap-2 text-sm text-ink-700">
                  <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
                  <span>
                    {PERMISSION_LABELS[permissionKey]}
                    <span className="block font-mono text-2xs meta">{permissionKey}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-600">
              Your role currently holds no permissions. Ask a director to assign the preset that matches your work.
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed meta">
            Prefer the least access that lets you work: a{' '}
            <Link href="/admin/staff" className="underline underline-offset-2">
              Reviewer
            </Link>{' '}
            can assess applications without seeing applicant contact details at all.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
