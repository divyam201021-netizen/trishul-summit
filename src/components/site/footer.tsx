import Link from 'next/link'
import { ArrowUpRight, Briefcase, Camera, ExternalLink, Globe, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Ph, Tbd } from '@/components/ui/placeholder'
import { TridentRule } from './motif'
import { FOOTER_POLICIES, PRIMARY_NAV } from './nav'
import { getEventConfig } from '@/lib/config'

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  href?: string | null
}) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 meta" aria-hidden="true">
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-mono text-2xs tracking-wider meta uppercase">{label}</span>
        {value && href ? (
          <a href={href} className="link-underline text-ink-100" rel="noreferrer noopener" target="_blank">
            {value}
          </a>
        ) : (
          <Tbd label={label === 'Support email' ? 'SUPPORT EMAIL' : label === 'Support channel' ? 'SUPPORT CHANNEL' : label.toUpperCase()} className="data-[placeholder]:text-accent-300" />
        )}
      </span>
    </li>
  )
}

export async function SiteFooter() {
  const config = await getEventConfig()
  const wordmark = config.text('identity.wordmark') ?? 'TRISHUL SUMMIT'
  const supportEmail = config.text('contact.supportEmail')
  const supportChannel = config.text('contact.supportChannel')
  const instagram = config.text('contact.instagram')
  const linkedin = config.text('contact.linkedin')
  const otherSocial = config.text('contact.otherSocial')

  return (
    <footer data-surface="ink" className="dark-band ink-canvas grain-dark bevel-top text-ink-200">
      <div className="shell py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="space-y-5">
            <p className="wordmark text-2xl text-white">{wordmark}</p>
            <TridentRule tone="dark" className="max-w-[9rem]" />
            <p className="max-w-sm text-sm leading-relaxed text-ink-400">
              <Ph path="identity.shortDescription" />
            </p>
            <p className="font-mono text-2xs tracking-wider meta uppercase">
              <Ph path="event.format" /> · <Ph path="event.dateSummary" /> · <Ph path="event.timeZone" />
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="eyebrow mb-4 text-accent-300">Explore</h2>
            <ul className="space-y-2.5">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-underline text-sm text-ink-300 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Policies">
            <h2 className="eyebrow mb-4 text-accent-300">Policies</h2>
            <ul className="space-y-2.5">
              {FOOTER_POLICIES.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-underline text-sm text-ink-300 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-6">
            <div>
              <h2 className="eyebrow mb-4 text-accent-300">Contact</h2>
              <ul className="space-y-4">
                <ContactRow
                  icon={<Mail className="size-4" />}
                  label="Support email"
                  value={supportEmail}
                  href={supportEmail ? `mailto:${supportEmail}` : null}
                />
                <ContactRow
                  icon={<MessageSquare className="size-4" />}
                  label="Support channel"
                  value={supportChannel}
                  href={null}
                />
              </ul>
            </div>
            <div>
              <h2 className="eyebrow mb-4 text-accent-300">Social</h2>
              <ul className="flex flex-wrap gap-3">
                <SocialLink icon={<Camera className="size-4" aria-hidden="true" />} label="Instagram" href={instagram} />
                <SocialLink icon={<Briefcase className="size-4" aria-hidden="true" />} label="LinkedIn" href={linkedin} />
                <SocialLink icon={<Globe className="size-4" aria-hidden="true" />} label="Other social" href={otherSocial} />
              </ul>
            </div>
          </div>
        </div>

        <span aria-hidden="true" className="my-10 block h-px w-full bg-gradient-to-r from-white/20 via-white/8 to-transparent" />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-2">
            <p className="eyebrow meta">Organizer</p>
            <p className="text-sm text-ink-300">
              <Ph path="identity.organizer" />
            </p>
          </div>
          <div className="space-y-2 lg:text-right">
            <p className="font-mono text-2xs meta">
              {config.text('legal.policyVersion') ? `Policy version ${config.text('legal.policyVersion')}` : null}
            </p>
            <p className="text-xs meta">© 2026 Trishul Summit. All rights reserved.</p>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed meta">
          Placeholders such as <span className="tbd">[EVENT DATE — TBD]</span> are shown wherever the organizing
          committee has not yet published confirmed information. Nothing on this site is invented: details appear
          here only once they are approved and published from the organizer workspace.
        </p>
      </div>
    </footer>
  )
}

function SocialLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode
  label: string
  href?: string | null
}) {
  if (href) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'group inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs text-ink-200 transition-all duration-[var(--dur-3)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-accent-400/60 hover:text-white',
          )}
        >
          {icon}
          {label}
          <ArrowUpRight
            className="size-3 transition-transform duration-200 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </a>
      </li>
    )
  }
  return (
    <li>
      <span
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-white/15 px-3 py-2 font-mono text-[10px] tracking-wider text-accent-300 uppercase"
        data-placeholder={label.toUpperCase()}
        title={`${label}: to be confirmed by the organizing committee`}
      >
        {icon}
        [{label.toUpperCase()} — TBD]
      </span>
    </li>
  )
}
