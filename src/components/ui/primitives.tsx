import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  BadgeCheck,
  Ban,
  CalendarX2,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  Clock4,
  Hourglass,
  Info,
  LayoutList,
  Search,
  ShieldAlert,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { KineticText } from '@/components/site/kinetic'
import { statusMeta, type StatusTone } from '@/lib/registration/status'

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  interactive,
  framed,
  as = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  interactive?: boolean
  /** Adds drafting brackets to the outer corners — for feature plates only. */
  framed?: boolean
  as?: 'div' | 'article' | 'li'
}) {
  const Component = as as React.ElementType
  return (
    <Component
      className={cn(
        'relative rounded-xl border border-ink-200/90 bg-paper-raised',
        interactive && 'lift press hover:border-ink-300',
        className,
      )}
      data-interactive={interactive ? '' : undefined}
      data-framed={framed ? '' : undefined}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 border-b border-ink-200/70 px-5 py-4 sm:px-6', className)} {...props} />
}

export function CardTitle({ className, as: As = 'h3', ...props }: React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <As className={cn('font-display text-lg leading-snug text-ink-900', className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 border-t border-ink-200/70 px-5 py-4 sm:px-6', className)}
      {...props}
    />
  )
}

/**
 * Engraved section numeral — page furniture, not information.
 *
 * Rendered as an outlined figure rather than a decorative image, and it drifts
 * against the scroll (see `.figure-scroll`) so long pages have a sense of depth
 * with nothing loading, animating on a timer, or conveying meaning.
 */
export function SectionFigure({ index, className }: { index: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('section-figure figure-scroll', className)}>
      {index}
    </span>
  )
}

/**
 * Vertical page section with consistent rhythm and an optional eyebrow.
 *
 * `figure` adds the oversized outlined numeral at the top right; the section is
 * isolated so the figure can sit behind the content without either one having
 * to claim a stack order.
 */
export function Section({
  className,
  surface = 'paper',
  figure,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  surface?: 'paper' | 'ink' | 'sunk'
  /** Two-digit section numeral, e.g. "03". Purely presentational. */
  figure?: string
}) {
  const surfaces = {
    paper: 'bg-paper text-ink-800',
    ink: 'dark-band ink-canvas grain-dark text-ink-100',
    sunk: 'bg-paper-sunk text-ink-800 texture-meridian-deep',
  } as const
  return (
    <section
      data-surface={surface === 'ink' ? 'ink' : undefined}
      className={cn('relative isolate py-20 sm:py-24 lg:py-32', surfaces[surface], className)}
      {...props}
    >
      {figure ? (
        <SectionFigure index={figure} className="top-8 right-3 sm:top-12 sm:right-6 lg:top-16 lg:right-10" />
      ) : null}
      {children}
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  align = 'left',
  className,
  as: As = 'h2',
  tone = 'light',
  kinetic = true,
}: {
  eyebrow?: React.ReactNode
  /** Optional section numeral rendered beside the eyebrow, e.g. 03. */
  index?: string
  /**
   * A plain string title is revealed word by word. Titles built from JSX keep
   * the plain render, since they may contain emphasis we must not split.
   */
  title: React.ReactNode
  /** Set false for headings inside dialogs or panels where motion distracts. */
  kinetic?: boolean
  description?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
  as?: 'h1' | 'h2' | 'h3'
  tone?: 'light' | 'dark'
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? (
        <p
          className={cn(
            'eyebrow mb-4',
            index ? 'eyebrow-num' : undefined,
            tone === 'dark' ? 'text-accent-300' : 'text-brand-700',
          )}
          {...(index ? { 'data-index': index } : {})}
        >
          {eyebrow}
        </p>
      ) : null}
      <As
        className={cn(
          'font-display',
          As === 'h1' ? 'text-display-lg' : 'text-display-sm',
          tone === 'dark' ? 'text-white' : 'text-ink-900',
        )}
      >
        {kinetic && typeof title === 'string' ? <KineticText text={title} /> : title}
      </As>
      {description ? (
        <div
          className={cn(
            'mt-4 text-base leading-relaxed sm:text-lg',
            tone === 'dark' ? 'text-ink-300' : 'text-ink-600',
          )}
        >
          {description}
        </div>
      ) : null}
    </div>
  )
}

export function Rule({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-px w-full', tone === 'dark' ? 'bg-white/12' : 'bg-ink-200', className)}
    />
  )
}

export function Eyebrow({ className, tone = 'light', ...props }: React.HTMLAttributes<HTMLParagraphElement> & { tone?: 'light' | 'dark' }) {
  return <p className={cn('eyebrow', tone === 'dark' ? 'text-accent-300' : 'text-brand-700', className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/* Badges & status                                                             */
/* -------------------------------------------------------------------------- */

/* Squared, stamp-like badges: an institutional mark rather than an app pill. */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-2xs font-medium tracking-[0.08em] uppercase',
  {
    variants: {
      tone: {
        neutral: 'border-ink-300 bg-ink-100 text-ink-700',
        brand: 'border-brand-200 bg-brand-50 text-brand-800',
        progress: 'border-brand-300 bg-brand-50 text-brand-800',
        positive: 'border-success-500/35 bg-success-50 text-success-700',
        warning: 'border-warning-500/40 bg-warning-50 text-warning-700',
        negative: 'border-danger-500/35 bg-danger-50 text-danger-700',
        dark: 'border-white/20 bg-white/8 text-ink-100',
        outline: 'border-ink-300 bg-transparent text-ink-600',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  icon,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { icon?: React.ReactNode }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon}
      {props.children}
    </span>
  )
}

const STATUS_ICONS = {
  draft: CircleDashed,
  submitted: LayoutList,
  review: Clock4,
  action: CircleAlert,
  payment: Clock4,
  confirmed: BadgeCheck,
  waitlist: Hourglass,
  declined: CircleSlash,
  withdrawn: Ban,
  cancelled: Ban,
} as const

/**
 * Status is never communicated by colour alone: each badge pairs an icon, a
 * text label and a tone, and exposes the full explanation to screen readers.
 */
export function StatusBadge({
  status,
  className,
  showExplanation = false,
}: {
  status: string | null | undefined
  className?: string
  showExplanation?: boolean
}) {
  const meta = statusMeta(status)
  const Icon = STATUS_ICONS[meta.icon] ?? Info
  const tone: StatusTone = meta.tone
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <span className={cn(badgeVariants({ tone }))}>
        <Icon className="size-3.5" aria-hidden="true" />
        {meta.label}
      </span>
      <span className="sr-only">Application status: {meta.label}. {meta.explanation}</span>
      {showExplanation ? <span className="text-sm text-ink-600">{meta.explanation}</span> : null}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Alerts                                                                      */
/* -------------------------------------------------------------------------- */

const alertVariants = cva('flex items-start gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-brand-200 bg-brand-50 text-brand-900',
      success: 'border-success-500/30 bg-success-50 text-success-700',
      warning: 'border-warning-500/40 bg-warning-50 text-warning-700',
      error: 'border-danger-500/35 bg-danger-50 text-danger-700',
      neutral: 'border-ink-200 bg-paper-sunk text-ink-700',
    },
  },
  defaultVariants: { tone: 'info' },
})

export function Alert({
  tone,
  title,
  children,
  className,
  live = 'polite',
  icon,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error' | 'neutral'
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
  live?: 'polite' | 'assertive' | 'off'
  icon?: React.ReactNode
}) {
  const DefaultIcon =
    tone === 'error' ? ShieldAlert : tone === 'warning' ? TriangleAlert : tone === 'success' ? CircleCheck : Info
  return (
    <div
      className={cn(alertVariants({ tone }), className)}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={live === 'off' ? undefined : live}
    >
      {icon ?? <DefaultIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Empty & error states                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Every empty or failed state explains what happened and what to do next —
 * "Something went wrong" is never an acceptable outcome on this platform.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = 'neutral',
}: {
  icon?: React.ReactNode
  title: string
  description: React.ReactNode
  action?: React.ReactNode
  className?: string
  tone?: 'neutral' | 'warning'
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        tone === 'warning' ? 'border-warning-500/40 bg-warning-50' : 'texture-hatch border-ink-300 bg-paper-sunk/70',
        className,
      )}
    >
      <span className="relative flex size-11 items-center justify-center rounded-full border border-ink-200 bg-paper-raised meta">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-ink-300/70 animate-pulse-ring"
        />
        {icon ?? <Search className="size-5" aria-hidden="true" />}
      </span>
      <h3 className="font-display text-lg text-ink-900">{title}</h3>
      <div className="max-w-md text-sm leading-relaxed text-ink-600">{description}</div>
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}

export const EMPTY_STATE_ICONS = {
  noResults: Search,
  noCommittees: LayoutList,
  noSchedule: CalendarX2,
  noAnnouncements: Info,
  noAssignment: Hourglass,
  notFound: CircleSlash,
  network: WifiOff,
  server: ShieldAlert,
} as const

/* -------------------------------------------------------------------------- */
/* Stats & tables                                                              */
/* -------------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-ink-200 bg-paper-raised p-4 transition-colors duration-300 hover:border-ink-300',
        className,
      )}
    >
      {/* Brass hairline that fills in on hover — a stat that acknowledges you. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent-400 transition-transform duration-[var(--dur-4)] ease-[var(--ease-out-expo)] group-hover:scale-x-100"
      />
      <p className="eyebrow meta">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-relaxed meta">{hint}</p> : null}
    </div>
  )
}

export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('table-scroll rounded-xl border border-ink-200 bg-paper-raised', className)}>
      <table className="w-full min-w-[52rem] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('border-b border-ink-200 bg-paper-sunk/70 px-4 py-3 text-left font-mono text-2xs tracking-[0.1em] meta uppercase', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-ink-100 px-4 py-3 align-top text-ink-700', className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function KeyValue({
  label,
  children,
  className,
}: {
  label: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 border-b border-ink-100 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6', className)}>
      <dt className="eyebrow shrink-0 meta sm:w-52">{label}</dt>
      <dd className="text-sm leading-relaxed text-ink-800">{children}</dd>
    </div>
  )
}

export function Progress({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-600">
        <span>{label}</span>
        <span className="tabular-nums">{clamped}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="relative h-full overflow-hidden rounded-full bg-brand-600 transition-[width] duration-[var(--dur-4)] ease-[var(--ease-out-expo)]"
          style={{ width: `${clamped}%` }}
        >
          <span aria-hidden="true" className="shimmer absolute inset-0 rounded-full opacity-60" />
        </div>
      </div>
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-2xs tracking-wide meta uppercase">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="link-underline hover:text-ink-800">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-700">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}
