/**
 * Role-based access control. Permissions are plain strings checked server-side
 * on every admin action and query — never in the client only.
 *
 * Principle of least privilege: each preset grants the minimum needed for the
 * role, and sensitive personal data has its own permission so that reviewers
 * can assess an application without seeing contact details.
 */
export const PERMISSIONS = {
  applicationsView: 'applications.view',
  applicationsSensitive: 'applications.sensitive',
  applicationsStatus: 'applications.status',
  applicationsAssign: 'applications.assign',
  applicationsNotes: 'applications.notes',
  applicationsExport: 'applications.export',
  committeesManage: 'committees.manage',
  scheduleManage: 'schedule.manage',
  paymentsView: 'payments.view',
  paymentsManage: 'payments.manage',
  communicationsSend: 'communications.send',
  contentManage: 'content.manage',
  settingsManage: 'settings.manage',
  staffManage: 'staff.manage',
  auditView: 'audit.view',
  reportsView: 'reports.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.applicationsView]: 'View applications',
  [PERMISSIONS.applicationsSensitive]: 'View applicant personal data',
  [PERMISSIONS.applicationsStatus]: 'Change application status',
  [PERMISSIONS.applicationsAssign]: 'Allocate committees',
  [PERMISSIONS.applicationsNotes]: 'Write internal reviewer notes',
  [PERMISSIONS.applicationsExport]: 'Export application data',
  [PERMISSIONS.committeesManage]: 'Manage committees',
  [PERMISSIONS.scheduleManage]: 'Manage schedule',
  [PERMISSIONS.paymentsView]: 'View payments',
  [PERMISSIONS.paymentsManage]: 'Reconcile payments',
  [PERMISSIONS.communicationsSend]: 'Send communications',
  [PERMISSIONS.contentManage]: 'Manage public content',
  [PERMISSIONS.settingsManage]: 'Manage event settings',
  [PERMISSIONS.staffManage]: 'Manage staff & roles',
  [PERMISSIONS.auditView]: 'View audit log',
  [PERMISSIONS.reportsView]: 'View reports & analytics',
}

export interface RolePreset {
  key: string
  name: string
  description: string
  permissions: Permission[]
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    key: 'super_admin',
    name: 'Director / Super admin',
    description: 'Full control including staff, settings and audit.',
    permissions: ALL_PERMISSIONS,
  },
  {
    key: 'organizer',
    name: 'Organizer',
    description: 'Runs the summit: programme, applications, communications.',
    permissions: [
      PERMISSIONS.applicationsView,
      PERMISSIONS.applicationsSensitive,
      PERMISSIONS.applicationsStatus,
      PERMISSIONS.applicationsAssign,
      PERMISSIONS.applicationsNotes,
      PERMISSIONS.applicationsExport,
      PERMISSIONS.committeesManage,
      PERMISSIONS.scheduleManage,
      PERMISSIONS.paymentsView,
      PERMISSIONS.communicationsSend,
      PERMISSIONS.contentManage,
      PERMISSIONS.auditView,
      PERMISSIONS.reportsView,
    ],
  },
  {
    key: 'registrar',
    name: 'Registrar',
    description: 'Reviews and processes applications and allocations.',
    permissions: [
      PERMISSIONS.applicationsView,
      PERMISSIONS.applicationsSensitive,
      PERMISSIONS.applicationsStatus,
      PERMISSIONS.applicationsAssign,
      PERMISSIONS.applicationsNotes,
      PERMISSIONS.reportsView,
    ],
  },
  {
    key: 'reviewer',
    name: 'Reviewer',
    description: 'Assesses applications without access to contact details.',
    permissions: [
      PERMISSIONS.applicationsView,
      PERMISSIONS.applicationsStatus,
      PERMISSIONS.applicationsNotes,
      PERMISSIONS.reportsView,
    ],
  },
  {
    key: 'finance',
    name: 'Finance',
    description: 'Payments, reconciliation and financial reporting.',
    permissions: [PERMISSIONS.applicationsView, PERMISSIONS.paymentsView, PERMISSIONS.paymentsManage, PERMISSIONS.reportsView],
  },
  {
    key: 'communications',
    name: 'Communications',
    description: 'Participant messaging and public content.',
    permissions: [
      PERMISSIONS.applicationsView,
      PERMISSIONS.communicationsSend,
      PERMISSIONS.contentManage,
      PERMISSIONS.reportsView,
    ],
  },
]

export function hasPermission(granted: string[] | undefined | null, permission: Permission): boolean {
  if (!granted) return false
  return granted.includes(permission)
}

export function hasAnyPermission(granted: string[] | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(granted, permission))
}

export function permissionsForPreset(key: string): Permission[] {
  return ROLE_PRESETS.find((role) => role.key === key)?.permissions ?? []
}
