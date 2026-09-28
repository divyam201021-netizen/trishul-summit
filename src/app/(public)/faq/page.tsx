import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { listFaq } from '@/lib/content/queries'
import { Eyebrow, EmptyState, Section } from '@/components/ui/primitives'
import { FaqList } from '@/components/site/faq-list'
import { PendingContent } from '@/components/ui/placeholder'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'FAQ',
    description:
      'Answers about participation, experience requirements, dates, online participation, fees, committee allocation, registration and support. Unanswered questions are labelled to be confirmed.',
    path: '/faq',
  })
}

export default async function FaqPage() {
  const items = await listFaq()
  const unanswered = items.filter((item) => !item.answer).length

  return (
    <Section>
      <div className="shell">
        <div className="max-w-3xl space-y-6">
          <Eyebrow>Questions</Eyebrow>
          <h1 className="font-display text-display">Frequently asked questions</h1>
          <p className="text-lg leading-relaxed text-ink-600">
            Twelve questions cover what the summit is, who can take part, how registration works, fees, committee
            allocation and support. Where the organizing committee has not yet published an answer, the question stays
            visible and is marked as to be confirmed.
          </p>
        </div>

        <div className="mt-12">
          {items.length ? (
            <>
              <FaqList items={items} />
              {unanswered > 0 ? (
                <div className="mt-6">
                  <PendingContent title={`${unanswered} ${unanswered === 1 ? 'answer is' : 'answers are'} still to be published`}>
                    We would rather show that an answer is pending than publish something we cannot stand behind. If your
                    question is time-sensitive, <Link href="/contact" className="underline underline-offset-2">contact the organizing committee</Link>{' '}
                    and a person will reply.
                  </PendingContent>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="The FAQ has not been published yet"
              description={
                <>
                  Questions and answers are written and published by the organizing committee. In the meantime,{' '}
                  <Link href="/delegate-info" className="underline underline-offset-2">
                    delegate information
                  </Link>{' '}
                  covers eligibility, requirements and the registration process.
                </>
              }
            />
          )}
        </div>
      </div>
    </Section>
  )
}
