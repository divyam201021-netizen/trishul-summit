import { redirect } from 'next/navigation'
import { getCurrentAdmin, getCurrentParticipant, type AuthenticatedAdmin, type AuthenticatedParticipant } from './session'
import { hasPermission, type Permission } from './permissions'

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/** Participant guard. Unauthenticated visitors are sent to sign-in with a return path. */
export async function requireParticipant(returnTo = '/portal'): Promise<AuthenticatedParticipant> {
  const participant = await getCurrentParticipant()
  if (!participant) {
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`)
  }
  return participant
}

/** Admin guard. Optionally requires a specific permission. */
export async function requireAdmin(permission?: Permission): Promise<AuthenticatedAdmin> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect('/admin/sign-in?next=/admin')
  }
  if (permission && !hasPermission(admin.permissions, permission)) {
    redirect('/admin/forbidden')
  }
  return admin
}

/** Non-redirecting variant for server actions: throws so the action can report cleanly. */
export async function assertAdmin(permission?: Permission): Promise<AuthenticatedAdmin> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new AuthorizationError('Your session has expired. Sign in again to continue.')
  if (permission && !hasPermission(admin.permissions, permission)) {
    throw new AuthorizationError()
  }
  return admin
}

export async function requirePermission(permission: Permission): Promise<AuthenticatedAdmin> {
  return assertAdmin(permission)
}
