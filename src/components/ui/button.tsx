import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Button system. Four intents, four sizes, plus a genuine loading state that
 * keeps the label (and therefore the accessible name) intact.
 *
 * Interaction contract, shared with every other control on the platform:
 *   • hover   — surface shift plus a single light sweep (`.sheen`)
 *   • active  — 1px press (`.press`)
 *   • focus   — 2px brand outline, always visible, never removed
 */
export const buttonVariants = cva(
  'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-quint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-55 active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-ink-900 text-ink-50 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_10px_24px_-14px_rgba(11,11,15,0.7)] hover:bg-ink-800',
        brand: 'bg-brand-600 text-white shadow-[var(--shadow-brand)] hover:bg-brand-700',
        secondary:
          'border border-ink-300 bg-paper-raised text-ink-800 shadow-[var(--shadow-hair)] hover:border-ink-400 hover:bg-ink-50',
        ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
        outline: 'border border-ink-900/25 text-ink-900 hover:bg-ink-900 hover:text-ink-50',
        onDark:
          'border border-white/25 bg-white/6 text-ink-50 backdrop-blur-sm hover:border-accent-400/70 hover:bg-white/12',
        destructive: 'bg-danger-600 text-white shadow-[0_14px_30px_-18px_rgba(134,35,24,0.8)] hover:bg-danger-700',
        link: 'h-auto p-0 text-brand-700 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base sm:h-13 sm:px-7',
        icon: 'size-10',
        none: '',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingLabel?: string
}

/** Applies the light sweep only where it reads as polish, never on text links. */
function sweepClass(variant?: string | null) {
  return variant === 'link' || variant === 'ghost' ? undefined : 'sheen'
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild,
  loading,
  loadingLabel,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), sweepClass(variant), className)

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="relative size-4 animate-spin" aria-hidden="true" /> : null}
      <span className="relative">{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  )
}

export interface LinkButtonProps
  extends React.ComponentPropsWithoutRef<typeof Link>,
    Omit<VariantProps<typeof buttonVariants>, 'block'> {
  block?: boolean
}

export function LinkButton({ className, variant, size, block, ...props }: LinkButtonProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, block }), sweepClass(variant), className)}
      {...props}
    />
  )
}
