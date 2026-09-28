'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CircleAlert, RefreshCw, Undo2 } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/primitives'

/**
 * Error boundary.
 *
 * "Something went wrong" is not an acceptable outcome here. This screen says
 * what happened, that the visitor's data is unaffected, what to try, and gives a
 * reference (the digest) they can quote to support. The raw error is logged for
 * the operator and never shown — stack traces leak configuration and paths.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[trishul] unhandled error', error.digest ?? '', error.message)
  }, [error])

  return (
    <main id="main" className="flex min-h-dvh items-center bg-paper-sunk/60 py-16">
      <div className="shell">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-4">
            <p className="eyebrow text-danger-700">Unexpected error</p>
            <h1 className="font-display text-display-sm">This screen could not be loaded</h1>
            <p className="text-base leading-relaxed text-ink-600">
              The page failed while it was being prepared. Nothing you entered has been lost: form submissions either
              complete and are recorded, or they fail visibly with an explanation. There is no half-saved state.
            </p>
          </div>

          <Card>
            <CardBody className="space-y-5">
              <p className="flex items-start gap-2 text-sm font-medium text-ink-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-600" aria-hidden="true" />
                Try one of these
              </p>
              <ol className="space-y-2 text-sm leading-relaxed text-ink-600">
                <li>
                  <span className="font-medium text-ink-800">1.</span> Retry — most failures here are transient, such as a
                  dropped connection.
                </li>
                <li>
                  <span className="font-medium text-ink-800">2.</span> If you were submitting a form, reopen the page before
                  filling it in again. Submitting twice is safe: the platform rejects duplicates rather than double-recording.
                </li>
                <li>
                  <span className="font-medium text-ink-800">3.</span> If it keeps failing, send the reference below to the
                  organizing committee so the exact failure can be traced.
                </li>
              </ol>

              {error.digest ? (
                <p className="rounded-md border border-ink-200 bg-paper-sunk/60 p-3 text-xs text-ink-600">
                  Error reference: <span className="font-mono text-ink-800">{error.digest}</span>
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3 border-t border-ink-100 pt-5">
                <Button type="button" variant="primary" size="sm" onClick={reset}>
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Try again
                </Button>
                <LinkButton href="/" variant="secondary" size="sm">
                  <Undo2 className="size-3.5" aria-hidden="true" />
                  Back to the summit site
                </LinkButton>
                <LinkButton href="/portal" variant="ghost" size="sm">
                  My registration
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <p className="text-xs leading-relaxed meta">
            Technical detail is intentionally withheld from this screen.{' '}
            <Link href="/contact" className="link-underline text-brand-700">
              Contact the organizing committee
            </Link>{' '}
            if you need an explanation of what happened.
          </p>
        </div>
      </div>
    </main>
  )
}
