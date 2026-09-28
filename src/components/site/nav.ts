export interface NavItem {
  label: string
  href: string
  /** Shown in the mobile drawer to orient first-time visitors. */
  description?: string
  /**
   * Permission required to see and use this destination in the organizer
   * workspace. Filtering the navigation is a convenience only — every route and
   * every server action re-checks the same permission server-side.
   */
  permission?: string
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', href: '/', description: 'What the summit is and how to take part' },
  { label: 'About', href: '/about', description: 'Mission, audience and the online experience' },
  { label: 'Committees', href: '/committees', description: 'Directory of committees and agendas' },
  { label: 'Schedule', href: '/schedule', description: 'Programme by day, with the canonical time zone' },
  { label: 'Delegate Info', href: '/delegate-info', description: 'Eligibility, requirements and preparation' },
  { label: 'FAQ', href: '/faq', description: 'Answers to the questions we are asked most' },
  { label: 'Contact', href: '/contact', description: 'How to reach the organizing committee' },
]

export const FOOTER_POLICIES: NavItem[] = [
  { label: 'Privacy Notice', href: '/policies/privacy-notice' },
  { label: 'Terms of Participation', href: '/policies/participation-terms' },
  { label: 'Code of Conduct', href: '/policies/code-of-conduct' },
  { label: 'Cancellation / Refund Policy', href: '/policies/cancellation-refund-policy' },
  { label: 'Accessibility', href: '/accessibility' },
]

/** The portal rail: one destination per question a participant actually asks. */
export const PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/portal', description: 'Status, next steps and announcements' },
  { label: 'My application', href: '/portal/application', description: 'What you submitted and what you can still change' },
  { label: 'My committee', href: '/portal/committee', description: 'Allocation and agenda, released once confirmed' },
  { label: 'Schedule', href: '/portal/schedule', description: 'Programme by day in the event time zone' },
  { label: 'Preparation', href: '/portal/preparation', description: 'Platform, technical checks and joining instructions' },
  { label: 'Support', href: '/portal/support', description: 'How to reach a person on the organizing committee' },
]

export const PORTAL_LINKS: NavItem[] = [
  { label: 'Dashboard', href: '/portal' },
  { label: 'View application', href: '/portal/application' },
  { label: 'Committee information', href: '/portal/committee' },
  { label: 'Schedule', href: '/portal/schedule' },
  { label: 'Joining instructions', href: '/portal/preparation' },
  { label: 'Technical requirements', href: '/portal/preparation#technical' },
  { label: 'Code of Conduct', href: '/policies/code-of-conduct' },
  { label: 'Support', href: '/portal/support' },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Applications', href: '/admin/applications', permission: 'applications.view' },
  { label: 'Committees', href: '/admin/committees', permission: 'committees.manage' },
  { label: 'Schedule', href: '/admin/schedule', permission: 'schedule.manage' },
  { label: 'Payments', href: '/admin/payments', permission: 'payments.view' },
  { label: 'Communications', href: '/admin/communications', permission: 'communications.send' },
  { label: 'Content', href: '/admin/content', permission: 'content.manage' },
  { label: 'Settings', href: '/admin/settings', permission: 'settings.manage' },
  { label: 'Staff', href: '/admin/staff', permission: 'staff.manage' },
  { label: 'Audit', href: '/admin/audit', permission: 'audit.view' },
  { label: 'Reports', href: '/admin/reports', permission: 'reports.view' },
]

/** Suggested destinations for an account with limited permissions. */
export const ADMIN_FALLBACK_NAV: NavItem[] = [{ label: 'Dashboard', href: '/admin' }]
