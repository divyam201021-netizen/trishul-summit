import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileWarning } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getPolicyBySlug } from '@/lib/content/queries'
import { Breadcrumbs, Eyebrow, Section } from '@/components/ui/primitives'
import { PendingContent } from '@/components/ui/placeholder'
import { getEventConfig } from '@/lib/config'

const FALLBACK_TITLES: Record<string, string> = {
  'privacy-notice': 'Privacy Notice',
  'participation-terms': 'Terms of Participation',
  'code-of-conduct': 'Code of Conduct',
  'cancellation-refund-policy': 'Cancellation / Refund Policy',
  accessibility: 'Accessibility Statement',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const policy = await getPolicyBySlug(slug)
  const title = policy?.title ?? FALLBACK_TITLES[slug] ?? 'Policy'
  return buildPageMetadata({
    title,
    description: policy?.summary ?? `${title} for Trishul Summit participants.`,
    path: `/policies/${slug}`,
  })
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [policy, config] = await Promise.all([getPolicyBySlug(slug), getEventConfig()])

  // A policy that has not been authored yet still has a page, so links never 404 —
  // it simply states, honestly, that the text is not published.
  if (!policy && !FALLBACK_TITLES[slug]) notFound()

  const title = policy?.title ?? FALLBACK_TITLES[slug]!
  const body = policy?.body?.trim() || null

  return (
    <Section>
      <div className="shell max-w-3xl">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Policies', href: '/policies/privacy-notice' }, { label: title }]} />
        <Eyebrow>Policy</Eyebrow>
        <h1 className="mt-4 font-display text-display-sm">{title}</h1>
        {policy?.summary ? <p className="mt-4 text-lg leading-relaxed text-ink-600">{policy.summary}</p> : null}
        {policy ? (
          <p className="mt-3 font-mono text-2xs tracking-wider meta uppercase">
            Version {policy.version}
            {policy.published ? '' : ' · Draft — not yet published'}
          </p>
        ) : null}

        <div className="mt-10">
          {body ? (
            <div className="prose-editorial">
              {body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <PendingContent title="This policy has not been published yet" tone="warning">
              <p>
                The organizing committee has not published the text of this policy. It is listed here because
                registration references it, and the link must work. Nothing is drafted on the committee&apos;s behalf.
              </p>
              <p className="mt-2">
                If you need this policy before registering, contact support:{' '}
                <span className="font-mono">
                  {config.text('contact.supportEmail') ?? '[SUPPORT EMAIL — TBD]'}
                </span>
                .
              </p>
            </PendingContent>
          )}
        </div>

        <div className="mt-12 rounded-lg border border-ink-200 bg-paper-sunk/60 p-4 text-xs leading-relaxed text-ink-600">
          <p className="flex items-start gap-2">
            <FileWarning className="mt-0.5 size-3.5 shrink-0 text-warning-600" aria-hidden="true" />
            Policies are versioned. The version you accept during registration is recorded against your application, so
            a later change cannot retroactively alter what you agreed to.
          </p>
          <p className="mt-3">
            <Link href="/register" className="underline underline-offset-4">
              Return to registration
            </Link>
          </p>
        </div>
      </div>
    </Section>
  )
}
