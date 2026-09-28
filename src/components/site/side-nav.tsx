'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/components/site/nav'

/**
 * Section navigation for the participant portal and the organizer workspace.
 *
 * - horizontal, scrollable strip on mobile (one-thumb reachable) and a quiet
 *   vertical rail from `lg` upward
 * - the current section is marked with aria-current, not colour alone
 * - longest-prefix matching keeps /portal/application and /portal distinct
 */
export function SideNav({
  items,
  label,
  className,
}: {
  items: NavItem[]
  label: string
  className?: string
}) {
  const pathname = usePathname()
  const path = pathname.split('#')[0] ?? pathname

  const matches = items.filter((item) => {
    const href = item.href.split('#')[0] ?? item.href
    return path === href || path.startsWith(`${href}/`)
  })
  const activeHref = [...matches].sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav aria-label={label} className={className}>
      <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = item.href === activeHref
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative block rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  active
                    ? 'bg-ink-100 font-medium text-ink-900'
                    : 'text-ink-600 hover:bg-ink-100/70 hover:text-ink-900',
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 -left-px hidden w-0.5 rounded-full bg-brand-600 lg:block"
                  />
                ) : null}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
