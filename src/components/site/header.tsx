'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, LogOut, Menu, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, LinkButton } from '@/components/ui/button'
import { Logo } from './logo'
import { PRIMARY_NAV } from './nav'
import { ScrollProgress } from './reveal'
import { track } from '@/lib/analytics/track'
import type { LogoProps } from './logo'

/**
 * Global navigation.
 *
 * - sticky and visually lightweight: it gains a hairline and a translucent
 *   backdrop only after the hero scrolls away
 * - the full link row appears at 1280px, not 1024px: at 1024 the wordmark,
 *   seven links and the account actions together need ~1150px and simply do not
 *   fit. Between those widths the drawer is the correct navigation, not a
 *   cramped row that pushes the page sideways
 * - the mobile drawer traps focus, closes on Escape and on route change, and
 *   marks the current page with aria-current
 * - the REGISTER call to action is always reachable in one tap on mobile
 */
export function SiteHeader({
  brand,
  registrationStatusLabel,
  signedIn,
  signOutAction,
}: {
  /** Plain values only — the resolved config object cannot cross this boundary. */
  brand: Pick<LogoProps, 'wordmark' | 'logoUrl'>
  registrationStatusLabel: string
  signedIn: boolean
  signOutAction: () => Promise<void>
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [condensed, setCondensed] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const registrationStatus = registrationStatusLabel
  const registrationOpen = registrationStatus === 'OPEN'
  const registerHref = '/register'

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setCondensed(window.scrollY > 24))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    // Move focus into the drawer so keyboard users continue from the top.
    const firstLink = drawerRef.current?.querySelector<HTMLElement>('a, button')
    firstLink?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300',
        condensed
          ? 'border-b border-ink-200/80 bg-paper/85 shadow-[0_10px_30px_-28px_rgba(11,11,15,0.5)] backdrop-blur-md supports-[backdrop-filter]:bg-paper/70'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <a
        href="#main"
        className="not-sr-only-focusable sr-only absolute left-4 top-3 z-50 rounded-md bg-ink-900 px-4 py-2 text-sm text-ink-50"
      >
        Skip to content
      </a>

      <div className="shell flex h-16 items-center justify-between gap-4 sm:h-18">
        <Logo wordmark={brand.wordmark} logoUrl={brand.logoUrl} />

        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                      active ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900',
                    )}
                  >
                    <span className="link-underline">{item.label}</span>
                    {/* The current page is marked by shape as well as colour. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1 rounded-full bg-accent-500 transition-opacity duration-300',
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                      )}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          {signedIn ? (
            <>
              <LinkButton href="/portal" variant="secondary" size="sm">
                <UserRound className="size-4" aria-hidden="true" />
                My registration
              </LinkButton>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <LinkButton href="/sign-in" variant="ghost" size="sm">
              Sign in
            </LinkButton>
          )}
          <span
            onClickCapture={() => track('registration_cta_clicked', { location: 'header', label: 'register' })}
          >
            <LinkButton href={registerHref} variant="primary" size="sm">
              Register
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </span>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <span
            onClickCapture={() => track('registration_cta_clicked', { location: 'header-mobile', label: 'register' })}
          >
            <LinkButton href={registerHref} variant="primary" size="sm" className="h-9 px-3">
              Register
            </LinkButton>
          </span>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="inline-flex size-10 items-center justify-center rounded-md border border-ink-300 text-ink-800 transition-colors hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-navigation"
          ref={drawerRef}
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-ink-200 bg-paper texture-meridian-deep animate-slide-up sm:top-18 xl:hidden"
        >
          <nav aria-label="Mobile" className="shell py-6">
            <ul className="flex flex-col">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href} className="border-b border-ink-200 last:border-b-0">
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className="flex flex-col gap-1 py-4"
                  >
                    <span className="font-display text-lg text-ink-900">{item.label}</span>
                    {item.description ? <span className="text-xs meta">{item.description}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              <LinkButton href={registerHref} variant="primary" size="lg" block>
                Register for Trishul
              </LinkButton>
              {signedIn ? (
                <>
                  <LinkButton href="/portal" variant="secondary" size="lg" block>
                    My registration
                  </LinkButton>
                  <form action={signOutAction} className="contents">
                    <Button type="submit" variant="ghost" size="lg" block>
                      Sign out
                    </Button>
                  </form>
                </>
              ) : (
                <LinkButton href="/sign-in" variant="secondary" size="lg" block>
                  Sign in to my registration
                </LinkButton>
              )}
            </div>

            <div className="mt-8 rounded-lg border border-ink-200 bg-paper-sunk/60 p-4">
              <p className="eyebrow meta">Registration status</p>
              <p className="mt-2 text-sm text-ink-700">
                {registrationOpen
                  ? 'Registration is open.'
                  : registrationStatus === 'TBD'
                    ? 'Registration status will be published once dates are confirmed.'
                    : `Registration is currently ${registrationStatus.toLowerCase()}.`}
              </p>
            </div>
          </nav>
        </div>
      ) : null}
      {/* Reading progress. Decorative, so it is hidden from assistive tech. */}
      <ScrollProgress
        className={cn(
          'scroll-progress absolute inset-x-0 bottom-0 h-px bg-accent-500/80',
          condensed ? 'opacity-100' : 'opacity-0',
        )}
      />
    </header>
  )
}
