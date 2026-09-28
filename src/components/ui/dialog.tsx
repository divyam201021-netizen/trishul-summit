'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Accessible dialog: focus is trapped and returned, Escape closes, background
 * content is inert to assistive technology, and a title is mandatory so no
 * dialog ever opens without an accessible name.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  title,
  description,
  size = 'md',
}: {
  className?: string
  children: React.ReactNode
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/45 backdrop-blur-[2px] data-[state=closed]:animate-fade-in data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-ink-200 bg-paper-raised shadow-[var(--shadow-lift)] data-[state=open]:animate-scale-in',
          widths[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <DialogPrimitive.Title className="font-display text-lg text-ink-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-ink-600">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="rounded-md p-1.5 meta transition-colors hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        <div className={cn('px-5 py-5 sm:px-6', className)}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Confirmation dialog for consequential, hard-to-reverse actions. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = 'primary',
  children,
}: {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel: string
  onConfirm?: () => void
  tone?: 'primary' | 'destructive'
  children?: React.ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description} size="sm">
        <div className="space-y-4">
          {children}
          <div className="flex flex-wrap justify-end gap-3">
            <DialogPrimitive.Close className="inline-flex h-10 items-center rounded-md border border-ink-300 px-4 text-sm text-ink-700 hover:bg-ink-100">
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                'inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-white',
                tone === 'destructive' ? 'bg-danger-600 hover:bg-danger-700' : 'bg-ink-900 hover:bg-ink-800',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
