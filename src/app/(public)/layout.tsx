import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { AnnouncementBar } from '@/components/site/announcement-bar'
import { PageViewTracker } from '@/components/site/reveal'
import { brandProps, getEventConfig } from '@/lib/config'
import { getCurrentParticipant } from '@/lib/auth/session'
import { participantSignOut } from '@/lib/auth/actions'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [config, participant] = await Promise.all([getEventConfig(), getCurrentParticipant()])

  return (
    <div className="flex min-h-dvh flex-col">
      <AnnouncementBar config={config} />
      <SiteHeader
        brand={brandProps(config)}
        registrationStatusLabel={config.text('identity.registrationStatusLabel') ?? 'TBD'}
        signedIn={Boolean(participant)}
        signOutAction={participantSignOut}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <PageViewTracker surface="public" />
    </div>
  )
}
