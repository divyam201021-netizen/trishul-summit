import type { Metadata, Viewport } from 'next'
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google'
import './globals.css'
import { ConfigProvider } from '@/components/config-provider'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/overlays'
import { brandColorStyle, getEventConfig } from '@/lib/config'
import { getActiveSiteUrl } from '@/lib/seo'

const body = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
})

/**
 * Display face: Fraunces is a variable serif with soft, slightly wonky forms at
 * display sizes — it reads as commissioned editorial typography rather than a
 * default UI serif. Optical size, SOFT and WONK are all exposed so headings can
 * be tuned per scale (see the type ladder in globals.css).
 */
const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-serif',
  weight: 'variable',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
  fallback: ['Iowan Old Style', 'Georgia', 'Times New Roman', 'serif'],
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-code',
  weight: ['400', '500'],
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ee' },
    { media: '(prefers-color-scheme: dark)', color: '#080b0e' },
  ],
  colorScheme: 'light',
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getEventConfig()
  const siteUrl = getActiveSiteUrl(config)
  const name = config.text('identity.name') ?? 'Trishul Summit'
  const description =
    config.text('seo.defaultDescription') ??
    config.text('identity.shortDescription') ??
    `${name} is an online summit platform for Model United Nations. Event dates, fees and committee details are published by the organizing committee as they are confirmed.`
  const ogImage = config.text('seo.ogImageUrl')

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${name} — Online Model United Nations Summit`,
      template: `%s · ${config.text('seo.titleSuffix') ?? name}`,
    },
    description,
    applicationName: name,
    openGraph: {
      type: 'website',
      siteName: name,
      title: `${name} — Online Model United Nations Summit`,
      description,
      url: siteUrl,
      images: ogImage ? [{ url: ogImage, alt: `${name} social preview` }] : [{ url: '/opengraph-image', alt: `${name} social preview placeholder` }],
    },
    twitter: { card: 'summary_large_image', title: name, description },
    robots: { index: true, follow: true },
    alternates: { canonical: siteUrl },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getEventConfig()
  const brandStyle = brandColorStyle(config.text('identity.brandColor'))

  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <head>
        {brandStyle ? (
          // The primary brand colour is configurable content, not a build-time constant.
          <style id="ts-brand-tokens" dangerouslySetInnerHTML={{ __html: brandStyle }} />
        ) : null}
        <noscript>
          {/*
            Motion is an enhancement, never a dependency. Every reveal, kinetic
            mask and depth layer starts hidden purely so it can animate in, so
            if the client never runs they must resolve to their finished state
            — otherwise a no-JS visitor would be shown blank headings.
          */}
          <style>{`.reveal,.parallax,.tilt,.tilt-layer,.kinetic-word{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">
        <ConfigProvider values={config.values}>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}
