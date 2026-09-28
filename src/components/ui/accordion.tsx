'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Accordion = AccordionPrimitive.Root

export function AccordionItem({
  value,
  question,
  children,
  className,
}: {
  value: string
  question: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className={cn('group border-b border-ink-200 last:border-b-0', className)}
    >
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger className="flex w-full items-start justify-between gap-4 py-5 text-left transition-colors hover:text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          <span className="font-display text-base leading-snug text-ink-900 sm:text-lg">{question}</span>
          <span
            aria-hidden="true"
            className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-ink-300 text-ink-600 transition-transform duration-300 ease-[var(--ease-out-quint)] group-data-[state=open]:rotate-45 group-data-[state=open]:border-brand-500 group-data-[state=open]:text-brand-700"
          >
            <Plus className="size-3.5" />
          </span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:hidden">
        <div className="pb-6 pr-8 text-sm leading-relaxed text-ink-600">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}

/** Simple server-rendered disclosure for progressive-enhancement cases. */
export function Disclosure({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <details className={cn('group rounded-lg border border-ink-200 bg-paper-raised px-4', className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-ink-900 marker:hidden">
        {summary}
        <span aria-hidden="true" className="meta transition-transform group-open:rotate-45">
          <Plus className="size-4" />
        </span>
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-ink-600">{children}</div>
    </details>
  )
}
