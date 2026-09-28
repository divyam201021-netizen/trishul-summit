import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Wordmark.
 *
 * Until the organizer supplies an official logo file, a typographic wordmark is
 * used and explicitly labelled as a placeholder — we never invent or approximate
 * a brand mark.
 *
 * Props are deliberately primitives only: this component is rendered inside
 * client components (the sticky header), and the resolved configuration object
 * carries methods, which cannot cross the server/client boundary.
 */
export interface LogoProps {
  wordmark: string
  logoUrl?: string | null
  tone?: 'dark' | 'light'
  href?: string | null
  className?: string
  showPlaceholderLabel?: boolean
}

export function Logo({
  wordmark = 'TRISHUL SUMMIT',
  logoUrl = null,
  tone = 'dark',
  href = '/',
  className,
  showPlaceholderLabel = false,
}: LogoProps) {
  const content = (
    <span className={cn('group inline-flex items-baseline gap-3', className)}>
      {logoUrl ? (
        <Image src={logoUrl} alt={wordmark} width={140} height={32} className="h-8 w-auto" />
      ) : (
        <>
          <span className="flex flex-col leading-none">
            <span
              className={cn(
                'font-display text-[1.06rem] leading-none tracking-[0.14em] uppercase sm:text-[1.18rem]',
                tone === 'dark' ? 'text-ink-900' : 'text-white',
              )}
            >
              {wordmark}
            </span>
            {showPlaceholderLabel ? (
              <span
                className={cn(
                  'mt-1 font-mono text-[9px] tracking-[0.14em] uppercase',
                  tone === 'dark' ? 'text-warning-700' : 'text-accent-300',
                )}
                data-placeholder="OFFICIAL LOGO"
              >
                [OFFICIAL LOGO — PLACEHOLDER]
              </span>
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className={cn('hidden h-4 w-px self-center sm:block', tone === 'dark' ? 'bg-ink-300' : 'bg-white/25')}
          />
          <span
            aria-hidden="true"
            className={cn(
              'hidden font-mono text-[9px] leading-tight tracking-[0.18em] uppercase sm:block',
              tone === 'dark' ? 'meta' : 'text-ink-300',
            )}
          >
            Online
            <br />
            Summit
          </span>
        </>
      )}
    </span>
  )

  if (!href) return content
  return (
    <Link
      href={href}
      className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
      aria-label={`${wordmark} — home`}
    >
      {content}
    </Link>
  )
}
