'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { EmptyState } from '@/components/ui/primitives'
import { Input } from '@/components/ui/form'
import { Tbd } from '@/components/ui/placeholder'
import { track } from '@/lib/analytics/track'

export interface FaqEntry {
  id: string
  question: string
  answer: string | null
  category: string | null
}

/**
 * Scannable, searchable FAQ. Filtering happens on the client so the list stays
 * instantly responsive, and every entry remains a real disclosure control with
 * keyboard support. Unanswered questions render an unmistakable placeholder.
 */
export function FaqList({
  items,
  withSearch = true,
  surface = 'public',
}: {
  items: FaqEntry[]
  withSearch?: boolean
  surface?: 'public' | 'portal'
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))],
    [items],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!needle) return true
      return (
        item.question.toLowerCase().includes(needle) ||
        (item.answer ?? '').toLowerCase().includes(needle)
      )
    })
  }, [items, query, category])

  return (
    <div className="space-y-6">
      {withSearch ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="faq-search" className="eyebrow mb-2 block meta">
              Search the FAQ
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <Input
                id="faq-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  if (event.target.value.length > 1) track('faq_interaction', { action: 'search' })
                }}
                placeholder="Registration, committees, fees…"
                className="pl-10"
                aria-describedby="faq-search-hint"
              />
            </div>
            <p id="faq-search-hint" className="mt-2 text-xs meta">
              {filtered.length} of {items.length} questions
            </p>
          </div>

          {categories.length > 1 ? (
            <div className="sm:w-56">
              <label htmlFor="faq-category" className="eyebrow mb-2 block meta">
                Topic
              </label>
              <select
                id="faq-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full rounded-md border border-ink-300 bg-paper-raised px-3 text-sm text-ink-900"
              >
                <option value="all">All topics</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No questions match that search"
          description={
            <>
              Try a shorter search, clear the topic filter{surface === 'portal' ? ', or contact support' : ' or contact support'} — we would rather answer your question directly than have you guess.
            </>
          }
        />
      ) : (
        <Accordion type="single" collapsible className="rounded-xl border border-ink-200 bg-paper-raised px-5 sm:px-6">
          {filtered.map((item, index) => (
            <AccordionItem key={item.id} value={item.id} question={item.question}>
              {item.answer ? (
                <p className="whitespace-pre-line">{item.answer}</p>
              ) : (
                <p className="flex flex-wrap items-center gap-2">
                  <Tbd label="ANSWER" />
                  <span className="meta">
                    The organizing committee has not published an answer to this question yet.
                  </span>
                </p>
              )}
              {item.category ? (
                <p className="mt-3 font-mono text-2xs tracking-wider meta uppercase">{item.category}</p>
              ) : null}
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
