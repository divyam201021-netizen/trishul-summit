import { KeyRound, ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { ALL_PERMISSIONS, PERMISSIONS, PERMISSION_LABELS, ROLE_PRESETS, type Permission } from '@/lib/auth/permissions'
import { parsePermissions } from '@/lib/auth/roles'
import { prisma } from '@/lib/db/client'
import { createStaffUser, updateRolePermissions, updateStaffUser } from '@/lib/admin/actions'
import { formatDateTime, pluralize } from '@/lib/utils'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  SectionHeading,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { Field, Input, NativeSelect } from '@/components/ui/form'
import { ActionForm } from '@/components/ui/action-form'
import { MfaEnrolment } from '@/components/admin/mfa-enrolment'
import { PendingContent } from '@/components/ui/placeholder'

/**
 * Staff & roles.
 *
 * Access is a first-class part of the product, not a settings afterthought:
 * roles map to explicit permissions, reviewer accounts can be given access to
 * applications without access to personal data, and every change to an account
 * is audited. Disabling an account revokes its sessions immediately.
 */
export default async function AdminStaffPage() {
  const admin = await requireAdmin(PERMISSIONS.staffManage)
  const [staff, roles] = await Promise.all([
    prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      include: { role: { select: { name: true, key: true } } },
    }),
    prisma.adminRole.findMany({ orderBy: { name: 'asc' } }),
  ])

  const self = staff.find((member) => member.id === admin.id)

  return (
    <div className="space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Access control"
        title="Staff & roles"
        description="Who can sign in to this workspace, what each role may do, and the state of multi-factor authentication on every account."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="eyebrow meta">Organizer accounts</p>
            <p className="mt-2 font-display text-2xl text-ink-900 tabular-nums">{staff.length}</p>
            <p className="mt-1 text-xs meta">
              {staff.filter((member) => member.mfaEnabled).length} with MFA enabled
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow meta">Roles</p>
            <p className="mt-2 font-display text-2xl text-ink-900 tabular-nums">{roles.length}</p>
            <p className="mt-1 text-xs meta">{ROLE_PRESETS.length} built-in presets</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow meta">Your access</p>
            <p className="mt-2 text-sm text-ink-800">{admin.roleName}</p>
            <p className="mt-1 text-xs meta">{pluralize(admin.permissions.length, 'permission')}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <ShieldCheck className="size-4 meta" aria-hidden="true" />
            Your account security
          </CardTitle>
        </CardHeader>
        <CardBody>
          <MfaEnrolment enabled={Boolean(self?.mfaEnabled)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <UsersRound className="size-4 meta" aria-hidden="true" />
            Organizer accounts
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <TableWrap className="border-0">
            <caption className="sr-only">Organizer accounts with role, MFA state and sign-in history</caption>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>MFA</Th>
                <Th>Last sign-in</Th>
                <Th>Failed attempts</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <Td>
                    <span className="block text-ink-900">{member.name}</span>
                    <span className="block text-xs meta">{member.email}</span>
                  </Td>
                  <Td className="text-xs">{member.role.name}</Td>
                  <Td>
                    <Badge tone={member.mfaEnabled ? 'positive' : 'warning'}>
                      {member.mfaEnabled ? 'Enabled' : 'Not enabled'}
                    </Badge>
                  </Td>
                  <Td className="text-xs meta">
                    {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}
                  </Td>
                  <Td className="text-xs tabular-nums">
                    {member.failedLogins}
                    {member.lockedUntil && member.lockedUntil.getTime() > Date.now() ? (
                      <span className="block text-danger-700">locked until {formatDateTime(member.lockedUntil)}</span>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone={member.disabledAt ? 'neutral' : 'positive'}>
                      {member.disabledAt ? 'Disabled' : 'Active'}
                    </Badge>
                    {member.id === admin.id ? <span className="ml-2 text-xs meta">(you)</span> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <div className="grid gap-5 lg:grid-cols-2">
            {staff.map((member) => (
              <details key={member.id} className="rounded-lg border border-ink-200 bg-paper-raised">
                <summary className="cursor-pointer p-4 text-sm font-medium text-ink-900">
                  Manage {member.name}
                  {member.id === admin.id ? ' (your account)' : ''}
                </summary>
                <div className="space-y-5 border-t border-ink-200 p-4">
                  <ActionForm action={updateStaffUser} submitLabel="Change role" submitVariant="secondary" submitSize="sm">
                    <input type="hidden" name="id" value={member.id} />
                    <input type="hidden" name="action" value="change_role" />
                    <Field label="Role" hint="Changing a role takes effect on the account's next request.">
                      <NativeSelect name="roleKey" defaultValue={member.role.key}>
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                  </ActionForm>

                  <ActionForm action={updateStaffUser} submitLabel="Reset password" submitVariant="secondary" submitSize="sm">
                    <input type="hidden" name="id" value={member.id} />
                    <input type="hidden" name="action" value="reset_password" />
                    <Field
                      label="New password"
                      required
                      hint="At least 10 characters with upper- and lower-case letters and a number. All of this account's sessions are revoked immediately."
                    >
                      <Input name="password" type="password" minLength={10} required autoComplete="new-password" />
                    </Field>
                  </ActionForm>

                  <div className="flex flex-wrap gap-3 border-t border-ink-100 pt-4">
                    <ActionForm
                      action={updateStaffUser}
                      submitLabel={member.disabledAt ? 'Enable account' : 'Disable account'}
                      submitVariant={member.disabledAt ? 'secondary' : 'destructive'}
                      submitSize="sm"
                    >
                      <input type="hidden" name="id" value={member.id} />
                      <input type="hidden" name="action" value={member.disabledAt ? 'enable' : 'disable'} />
                    </ActionForm>
                    {member.mfaEnabled ? (
                      <ActionForm action={updateStaffUser} submitLabel="Disable MFA" submitVariant="ghost" submitSize="sm">
                        <input type="hidden" name="id" value={member.id} />
                        <input type="hidden" name="action" value="disable_mfa" />
                        <p className="text-xs leading-relaxed meta">
                          Only do this if the account holder has lost their authenticator and has been verified through a
                          second channel.
                        </p>
                      </ActionForm>
                    ) : null}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <UserPlus className="size-4 meta" aria-hidden="true" />
              Create an organizer account
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ActionForm action={createStaffUser} submitLabel="Create account" submitVariant="brand" submitSize="sm" resetOnSuccess>
              <Field label="Full name" required>
                <Input name="name" maxLength={120} required />
              </Field>
              <Field label="Email address" required>
                <Input name="email" type="email" required autoComplete="off" />
              </Field>
              <Field label="Role" required hint="Assign the least access the person needs.">
                <NativeSelect name="roleKey" defaultValue="reviewer" required>
                  {ROLE_PRESETS.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.name} — {preset.description}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Initial password" required hint="Share it through a secure channel, never over chat or email.">
                <Input name="password" type="password" minLength={10} required autoComplete="new-password" />
              </Field>
            </ActionForm>
            <p className="mt-4 text-xs leading-relaxed meta">
              No invitation email is sent: this platform does not email credentials, and never will.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <KeyRound className="size-4 meta" aria-hidden="true" />
              Role permissions
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <p className="text-sm leading-relaxed text-ink-600">
              Permissions are checked server-side on every action. Changing a role here changes what its members can do
              immediately — including revoking their own access to applications.
            </p>
            {roles.map((role) => {
              const granted = parsePermissions(role.permissions)
              return (
                <details key={role.id} className="rounded-lg border border-ink-200 bg-paper-raised">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <span className="font-medium text-ink-900">{role.name}</span>
                    <span className="text-xs meta">{pluralize(granted.length, 'permission')}</span>
                  </summary>
                  <div className="border-t border-ink-200 p-4">
                    <ActionForm action={updateRolePermissions} submitLabel="Save permissions" submitVariant="brand" submitSize="sm">
                      <input type="hidden" name="roleKey" value={role.key} />
                      <fieldset className="space-y-2">
                        <legend className="sr-only">Permissions for {role.name}</legend>
                        {ALL_PERMISSIONS.map((permission) => (
                          <label key={permission} className="flex items-start gap-2.5 text-sm text-ink-700">
                            <input
                              type="checkbox"
                              name="permissions"
                              value={permission}
                              defaultChecked={granted.includes(permission as Permission)}
                              disabled={role.key === 'super_admin'}
                              className="mt-0.5 size-4 rounded border-ink-400"
                            />
                            <span>
                              {PERMISSION_LABELS[permission]}
                              <span className="block font-mono text-2xs meta">{permission}</span>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    </ActionForm>
                    {role.key === 'super_admin' ? (
                      <p className="mt-3 text-xs meta">
                        The super admin role always holds every permission. Reducing it would make the workspace
                        unrecoverable, so it is fixed by design.
                      </p>
                    ) : null}
                  </div>
                </details>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <PendingContent title="Reviewer accounts can be PII-free by design">
        Assign the <span className="font-medium">Reviewer</span> preset to assess applications without seeing names, email
        addresses or institutions. That is a real privacy control, not a display setting — the data is never sent to the
        page.
      </PendingContent>
    </div>
  )
}
