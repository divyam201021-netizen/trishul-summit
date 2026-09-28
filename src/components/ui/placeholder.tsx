'use client'

import { forwardRef } from 'react'
import { CircleAlert, Info, Loader2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfigText } from '@/components/config-provider'

/**
 * ============================================================================
 * PLACEHOLDER PRIMITIVE
 * ============================================================================
 * Nothing on this platform may invent an event fact. Every unknown value is
 * rendered through this component, which prints an unmistakable
 * `[LABEL — TBD]` token, styles it subtly, exposes the reason to assistive
 * technology, and can be replaced later by editing one setting.
 */

export function Tbd({
  label,
  className,
  title,
}: {
  label: string
  className?: string
  title?: string
}) {
  const text = `[${label} — TBD]`
  return (
    <span className={cn('tbd', className)} data-placeholder={label} title={title ?? `${label}: to be confirmed by the organizing committee`}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{label}: to be confirmed by the organizing committee.</span>
    </span>
  )
}

/** Renders the configured value for a path, or its placeholder when unset. */
export const Ph = forwardRef<
  HTMLSpanElement,
  { path: string; className?: string; placeholderClassName?: string; fallbackToLabel?: boolean }
>(function Ph({ path, className, placeholderClassName }, ref) {
  const { value, placeholder } = useConfigText(path)
  if (value) {
    return (
      <span ref={ref} className={className} data-config={path}>
        {value}
      </span>
    )
  }
  return (
    <span ref={ref} className={placeholderClassName}>
      <Tbd
        className={className}
        label={placeholder.replace(/^\[/, '').replace(/ — TBD\]$/, '')}
      />
    </span>
  )
})

/** A block-level notice used where a whole section awaits approved content. */
export function PendingContent({
  title,
  children,
  tone = 'neutral',
  className,
}: {
  title: string
  children?: React.ReactNode
  tone?: 'neutral' | 'warning'
  className?: string
}) {
  const Icon = tone === 'warning' ? TriangleAlert : Info
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border border-dashed p-4 text-sm',
        tone === 'warning'
          ? 'border-warning-500/50 bg-warning-50 text-warning-700'
          : 'border-ink-300 bg-paper-sunk/60 text-ink-600',
        className,
      )}
      role="note"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {children ? <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div> : null}
      </div>
    </div>
  )
}

/** Placeholder for information that is still being finalised by an organizer. */
export function PlaceholderBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-warning-500/40 bg-warning-50 px-2 py-1 font-mono text-2xs tracking-wide text-warning-700 uppercase',
        className,
      )}
      data-placeholder={label}
    >
      <CircleAlert className="size-3" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink-100', className)} aria-hidden="true" />
}

/** Full-card loading skeleton used while admin/portal data streams in. */
export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-ink-200 bg-paper-raised p-5">
      <LoadingSkeleton className="h-4 w-1/3" />
      <LoadingSkeleton className="h-3 w-2/3" />
      <LoadingSkeleton className="h-3 w-1/2" />
    </div>
  )
}
