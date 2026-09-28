'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

/* -------------------------------- Tabs ---------------------------------- */

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex w-full gap-1 overflow-x-auto border-b border-ink-200 pb-px', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative shrink-0 rounded-t-md px-4 py-2.5 text-sm font-medium whitespace-nowrap text-ink-600 transition-colors hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 data-[state=active]:text-ink-900 data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-brand-600',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('pt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600', className)}
      {...props}
    />
  )
}

/* ------------------------------- Tooltip -------------------------------- */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}>{children}</TooltipPrimitive.Provider>
}

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs rounded-md border border-ink-800 bg-ink-950 px-3 py-2 text-xs leading-relaxed text-ink-100 shadow-[var(--shadow-lift)] animate-fade-in"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink-950" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/** Info affordance: a keyboard-focusable icon that explains a term. */
export function InfoHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip content={children}>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-5 items-center justify-center rounded-full border border-ink-300 align-middle font-mono text-[10px] text-ink-600 transition-colors hover:border-ink-500 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          i
        </button>
      </Tooltip>
    </TooltipProvider>
  )
}

/* ------------------------------- Dropdown -------------------------------- */

export const DropdownMenu = DropdownPrimitive.Root
export const DropdownMenuTrigger = DropdownPrimitive.Trigger

export function DropdownMenuContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-50 min-w-52 overflow-hidden rounded-lg border border-ink-200 bg-paper-raised p-1.5 shadow-[var(--shadow-lift)] animate-scale-in',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-700 outline-none select-none data-[highlighted]:bg-ink-100 data-[highlighted]:text-ink-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn('px-3 py-2 font-mono text-2xs tracking-wider meta uppercase', className)} {...props} />
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn('my-1 h-px bg-ink-200', className)} {...props} />
}
