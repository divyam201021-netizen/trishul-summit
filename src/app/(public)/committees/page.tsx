import Link from 'next/link'
import { ArrowRight, LayoutList, Search, SlidersHorizontal } from 'lucide-react'
import { getEventConfig } from '@/lib/config'
import { buildPageMetadata } from '@/lib/seo'
import { committeeFilterOptions, listCommittees } from '@/lib/content/queries'
import { Card, CardBody, EmptyState, Eyebrow, Section, badgeVariants } from '@/components/ui/primitives'
import { LinkButton } from '@/components/ui/button'
import { Tbd } from '@/components/ui/placeholder'
import { CommitteeCard } from '@/components/site/committee-card'
import { Reveal, TrackedLink } from '@/components/site/reveal'
import { cn } from '@/lib/utils'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Committees',
    description:
      'The committee directory: agenda topics, experience levels, languages, capacity and published availability. Placeholder entries are clearly labelled until official committees are announced.',
    path: '/committees',
  })
}

interface SearchParams {
  q?: string
  status?: string
  experience?: string
  language?: string
  sort?: string
}

export default async function CommitteesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const config = await getEventConfig()
  const [committees, options] = await Promise.all([
    listCommittees({
      q: params.q,
      status: params.status,
      experience: params.experience,
      language: params.language,
      sort: (params.sort as 'order' | 'name' | 'capacity') ?? 'order',
    }),
    committeeFilterOptions(),
  ])

  const hasFilters = Boolean(params.q || (params.status && params.status !== 'all') || (params.experience && params.experience !== 'all') || (params.language && params.language !== 'all'))
  const totalCapacity = committees.reduce((sum, committee) => sum + (committee.capacity ?? 0), 0)

  return (
    <>
      <Section className="pb-10 sm:pb-12">
        <div className="shell">
          <div className="max-w-3xl space-y-6">
            <Eyebrow>Committee directory</Eyebrow>
            <h1 className="font-display text-display">Committees</h1>
            <p className="text-lg leading-relaxed text-ink-600">
              Each committee has its own agenda, experience level, working language and capacity. Availability reflects
              the published state only — we never display seat scarcity that the organizing committee has not confirmed.
            </p>
            <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-ink-200 pt-5">
              <div className="space-y-1">
                <dt className="font-mono text-2xs tracking-wider meta uppercase">Committees listed</dt>
                <dd className="text-sm text-ink-800 tabular-nums">{committees.length}</dd>
              </div>
              <div className="space-y-1">
                <dt className="font-mono text-2xs tracking-wider meta uppercase">Published capacity</dt>
                <dd className="text-sm text-ink-800">
                  {totalCapacity > 0 ? `${totalCapacity} places` : <Tbd label="CAPACITY" />}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="font-mono text-2xs tracking-wider meta uppercase">Registration</dt>
                <dd className="text-sm text-ink-800">
                  {config.text('identity.registrationStatusLabel') === 'TBD' ? (
                    <Tbd label="OPEN / CLOSED — TBD" />
                  ) : (
                    config.text('identity.registrationStatusLabel')
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      {/* Filters submit with plain HTML so the directory is fully usable without JS. */}
      <div className="sticky top-16 z-30 border-y border-ink-200 bg-paper/90 backdrop-blur-sm">
        <div className="shell py-4">
          <form method="get" action="/committees" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <label htmlFor="q" className="eyebrow meta">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={params.q ?? ''}
                  placeholder="Committee, agenda, language"
                  className="h-10 w-full rounded-md border border-ink-300 bg-paper-raised pr-3 pl-9 text-sm text-ink-900"
                />
              </div>
            </div>

            <SelectField label="Availability" name="status" defaultValue={params.status ?? 'all'} options={[
              { value: 'all', label: 'Any availability' },
              { value: 'open', label: 'Open' },
              { value: 'waitlist', label: 'Waitlist only' },
              { value: 'closed', label: 'Closed' },
            ]} />

            <SelectField
              label="Experience"
              name="experience"
              defaultValue={params.experience ?? 'all'}
              options={[{ value: 'all', label: 'Any level' }, ...options.experiences.map((value) => ({ value, label: value }))]}
            />

            <SelectField
              label="Language"
              name="language"
              defaultValue={params.language ?? 'all'}
              options={[{ value: 'all', label: 'Any language' }, ...options.languages.map((value) => ({ value, label: value }))]}
            />

            <div className="flex items-end gap-2">
              <SelectField
                label="Sort"
                name="sort"
                defaultValue={params.sort ?? 'order'}
                options={[
                  { value: 'order', label: 'Programme order' },
                  { value: 'name', label: 'Name' },
                  { value: 'capacity', label: 'Capacity' },
                ]}
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink-900 px-4 text-sm font-medium text-ink-50 transition-colors hover:bg-ink-800"
              >
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>

      <Section className="pt-12">
        <div className="shell">
          <p className="mb-6 text-sm text-ink-600" role="status">
            Showing {committees.length} {committees.length === 1 ? 'committee' : 'committees'}
            {hasFilters ? ' matching your filters' : ''}.
          </p>

          {committees.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {committees.map((committee, index) => (
                <Reveal key={committee.id} delay={Math.min(index, 5) * 50}>
                  <CommitteeCard committee={committee} className="h-full" />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<LayoutList className="size-5" aria-hidden="true" />}
              title={hasFilters ? 'No committees match those filters' : 'No committees published yet'}
              description={
                hasFilters ? (
                  <>
                    Try removing a filter or searching for a shorter term. The directory only lists committees the
                    organizing committee has published.{' '}
                    <Link href="/committees" className="underline underline-offset-2">
                      Clear all filters
                    </Link>
                  </>
                ) : (
                  <>
                    The official committee list has not been published yet. Placeholder entries appear here as soon as
                    the committee structure is confirmed — nothing is invented in the meantime.{' '}
                    <Link href="/contact" className="underline underline-offset-2">
                      Contact the organizing committee
                    </Link>{' '}
                    if you need a committee confirmed for planning purposes.
                  </>
                )
              }
              action={
                <>
                  <TrackedLink event="registration_cta_clicked" props={{ location: 'committees-empty', label: 'register' }}>
                    <LinkButton href="/register" variant="primary">
                      Register your interest
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </LinkButton>
                  </TrackedLink>
                  <LinkButton href="/schedule" variant="secondary">
                    View schedule
                  </LinkButton>
                </>
              }
            />
          )}

          <Card className="mt-10">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-display text-lg text-ink-900">Preferences, not guarantees</p>
                <p className="max-w-2xl text-sm text-ink-600">
                  During registration you rank your committee preferences. The organizing committee allocates places
                  against capacity and experience, so a preference is not a confirmed assignment unless the committee
                  states otherwise in writing.
                </p>
              </div>
              <span className={cn(badgeVariants({ tone: 'outline' }))}>Allocation: <Tbd label="ALLOCATION PROCESS" /></span>
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="eyebrow meta">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-ink-300 bg-paper-raised px-3 text-sm text-ink-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
