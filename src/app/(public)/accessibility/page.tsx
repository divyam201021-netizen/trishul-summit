import Link from 'next/link'
import { Accessibility, Keyboard, MonitorSmartphone, Volume2 } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { getEventConfig } from '@/lib/config'
import { Card, CardBody, CardHeader, CardTitle, Eyebrow, Section, SectionHeading } from '@/components/ui/primitives'
import { Tbd } from '@/components/ui/placeholder'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Accessibility',
    description:
      'How Trishul Summit is built for keyboard, screen-reader and low-bandwidth access, and how to report a barrier.',
    path: '/accessibility',
  })
}

export default async function AccessibilityPage() {
  const config = await getEventConfig()

  return (
    <>
      <Section className="pb-10 sm:pb-12">
        <div className="shell max-w-3xl space-y-6">
          <Eyebrow>Accessibility</Eyebrow>
          <h1 className="font-display text-display">Accessibility statement</h1>
          <p className="text-lg leading-relaxed text-ink-600">
            Trishul Summit targets <strong className="text-ink-800">WCAG 2.2 level AA</strong>. Registration is designed
            to be completed entirely from the keyboard, and every status change is announced to assistive technology.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="shell grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: <Keyboard className="size-4" aria-hidden="true" />,
              title: 'Keyboard and focus',
              points: [
                'Every interactive control is reachable in a logical order.',
                'Focus is always visible, with a high-contrast outline.',
                'Dialogs and the mobile menu trap focus and return it on close.',
                'A skip-to-content link is the first stop on every public page.',
              ],
            },
            {
              icon: <Volume2 className="size-4" aria-hidden="true" />,
              title: 'Screen readers and status',
              points: [
                'Statuses pair an icon and a text label with their colour.',
                'Form errors are linked to their field and announced politely.',
                'Application status changes carry a plain-language explanation.',
                'Placeholders such as [EVENT DATE — TBD] are read as “to be confirmed”.',
              ],
            },
            {
              icon: <Accessibility className="size-4" aria-hidden="true" />,
              title: 'Perception and motion',
              points: [
                'Text meets AA contrast against its background.',
                'Motion is restrained, and honoured: prefers-reduced-motion removes it.',
                'Zoom to 200% and narrow reflow (320px) are supported.',
                'No information is conveyed by colour alone.',
              ],
            },
            {
              icon: <MonitorSmartphone className="size-4" aria-hidden="true" />,
              title: 'Connections and devices',
              points: [
                'Mobile-first layouts, including the whole registration flow.',
                'Public pages render with JavaScript disabled where practical.',
                'Minimal client-side JavaScript; no animation blocks progress.',
                'Fonts are optimised and swapped to avoid invisible text.',
              ],
            },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="meta">{section.icon}</span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm leading-relaxed text-ink-600">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent-500">
                        —
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="shell mt-12">
          <SectionHeading
            eyebrow="Feedback"
            title="Report a barrier"
            description="If any part of this platform prevents you from taking part, tell us and we will fix it — and complete the step with you in the meantime."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-mono text-2xs tracking-wider meta uppercase">Support email</p>
              <p className="text-sm text-ink-800">
                {config.text('contact.supportEmail') ?? <Tbd label="SUPPORT EMAIL" />}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-2xs tracking-wider meta uppercase">Response time</p>
              <p className="text-sm text-ink-800">
                {config.text('contact.supportResponseTime') ?? <Tbd label="SUPPORT RESPONSE TIME" />}
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-ink-600">
            <Link href="/contact" className="underline underline-offset-4">
              Contact the organizing committee
            </Link>{' '}
            or read the{' '}
            <Link href="/policies/privacy-notice" className="underline underline-offset-4">
              privacy notice
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  )
}
