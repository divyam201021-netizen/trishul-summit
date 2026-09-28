import Link from 'next/link'
import type { Metadata } from 'next'
import { Compass, LayoutList, Mail } from 'lucide-react'
import { getEventConfig } from '@/lib/config'
import { LinkButton } from '@/components/ui/button'
import { Card, CardBody, Eyebrow } from '@/components/ui/primitives'
import { PRIMARY_NAV } from '@/components/site/nav'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

/**
 * 404.
 *
 * A dead end is a conversion failure. This page offers the two things a lost
 * visitor actually wants — the main destinations, and a way to reach a person —
 * rather than an apology and a link to the homepage.
 */
export default async function NotFound() {
  const config = await getEventConfig()
  const supportEmail = config.text('contact.supportEmail')

  return (
    <main id="main" className="flex min-h-dvh items-center bg-paper-sunk/60 py-16">
      <div className="shell">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-4">
            <Eyebrow>Error 404</Eyebrow>
            <h1 className="font-display text-display-sm">That page does not exist</h1>
            <p className="text-base leading-relaxed text-ink-600">
              The address may be mistyped, or the page may have moved. Nothing has gone wrong with your application — if
              you were signed in, your session is intact.
            </p>
          </div>

          <Card>
            <CardBody className="space-y-5">
              <p className="flex items-center gap-2 text-sm font-medium text-ink-800">
                <Compass className="size-4 meta" aria-hidden="true" />
                Where would you like to go?
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {PRIMARY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="link-underline text-sm text-brand-700">
                      {item.label}
                    </Link>
                    {item.description ? <p className="text-xs leading-relaxed meta">{item.description}</p> : null}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 border-t border-ink-100 pt-5">
                <LinkButton href="/" variant="primary" size="sm">
                  Home
                </LinkButton>
                <LinkButton href="/register" variant="brand" size="sm">
                  Register
                </LinkButton>
                <LinkButton href="/portal" variant="secondary" size="sm">
                  <LayoutList className="size-3.5" aria-hidden="true" />
                  My registration
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p className="flex items-center gap-2 font-medium text-ink-800">
                <Mail className="size-4 meta" aria-hidden="true" />
                Still stuck?
              </p>
              <p>
                If a link on this site brought you here, that is a bug worth reporting. Tell the organizing committee which
                page you were on and where you were heading.
              </p>
              {supportEmail ? (
                <LinkButton href={`mailto:${supportEmail}`} variant="secondary" size="sm">
                  Email the organizing committee
                </LinkButton>
              ) : (
                <p className="text-sm">
                  Support email is not published yet — see the{' '}
                  <Link href="/contact" className="link-underline text-brand-700">
                    contact page
                  </Link>
                  .
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  )
}
