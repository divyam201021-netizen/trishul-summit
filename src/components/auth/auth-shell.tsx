import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Logo } from '@/components/site/logo'
import { brandProps, getEventConfig } from '@/lib/config'
import { Tbd } from '@/components/ui/placeholder'

/**
 * Centred shell for the two sign-in surfaces. Deliberately minimal: no primary
 * navigation competing with the task, the wordmark for trust, and a plain
 * statement of what the account is for.
 */
export async function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  tone = 'light',
}: {
  eyebrow: string
  title: string
  description: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  tone?: 'light' | 'ink'
}) {
  const config = await getEventConfig()
  const supportEmail = config.text('contact.supportEmail')
  const supportChannel = config.text('contact.supportChannel')
  const message = config.text('contact.supportResponseTime')

  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunk/60">
      <header className="border-b border-ink-200 bg-paper">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Logo {...brandProps(config)} />
          <Link href="/" className="text-sm text-ink-600 transition-colors hover:text-ink-900">
            Back to the summit site
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-ink-200 bg-paper-raised p-6 shadow-[var(--shadow-elevate)] sm:p-8">
            <p className={`eyebrow ${tone === 'ink' ? 'meta' : 'text-brand-700'}`}>{eyebrow}</p>
            <h1 className="mt-3 font-display text-[1.6rem] leading-tight text-ink-900 sm:text-[1.75rem]">{title}</h1>
            <div className="mt-3 text-sm leading-relaxed text-ink-600">{description}</div>
            <div className="mt-7">{children}</div>
          </div>

          <div className="mt-6 space-y-2 text-xs leading-relaxed meta">
            <p className="flex items-start gap-2">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Sessions are opaque, HttpOnly cookies. Signing in never exposes your data in a URL, and private pages are
              excluded from search engines.
            </p>
            <p>
              Need help signing in?{' '}
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} className="link-underline text-brand-700">
                  {supportEmail}
                </a>
              ) : (
                <Tbd label="SUPPORT EMAIL" />
              )}
              {supportChannel ? <span> · {supportChannel}</span> : null}
              {message ? <span> · {message}</span> : null}
            </p>
          </div>

          {footer ? <div className="mt-8 border-t border-ink-200 pt-6">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
