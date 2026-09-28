import { ImageResponse } from 'next/og'
import { getEventConfig } from '@/lib/config'

/**
 * Generated social preview.
 *
 * Until the organizer supplies approved artwork (`seo.ogImageUrl`), this card is
 * generated from configuration — wordmark, date and time zone — and any value
 * that is still unknown prints as its placeholder. It deliberately does NOT
 * invent a logo, a photograph or a date.
 */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Trishul Summit — online Model United Nations summit platform'

export default async function OpengraphImage() {
  let wordmark = 'TRISHUL SUMMIT'
  let tagline: string | null = null
  let dateLine = '[EVENT DATE — TBD]'
  let zoneLine = '[TIME ZONE — TBD]'
  let logoUrl: string | null = null
  let brandColor: string | null = null

  try {
    const config = await getEventConfig()
    wordmark = config.text('identity.wordmark') ?? wordmark
    tagline = config.text('identity.tagline')
    dateLine = config.text('event.dateSummary') ?? dateLine
    zoneLine = config.text('event.timeZone') ?? zoneLine
    logoUrl = config.text('identity.logoUrl')
    brandColor = config.text('identity.brandColor')
  } catch {
    // A preview image must never break a page render.
  }

  const accent = brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : '#C3A05A'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#080B0E',
          color: '#F5F6F7',
          padding: '64px 72px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            Online summit
          </div>
          <div style={{ display: 'flex', fontSize: 76, letterSpacing: 4, lineHeight: 1.05, textTransform: 'uppercase' }}>
            {wordmark}
          </div>
          {logoUrl ? null : (
            <div style={{ display: 'flex', fontSize: 20, letterSpacing: 2, color: '#C1C7CD' }}>
              [OFFICIAL LOGO — PLACEHOLDER]
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tagline ? (
            <div style={{ display: 'flex', fontSize: 30, color: '#DBDFE2', maxWidth: 900 }}>{tagline}</div>
          ) : (
            <div style={{ display: 'flex', fontSize: 26, color: '#C1C7CD' }}>[EVENT TAGLINE — TBD]</div>
          )}
          <div style={{ display: 'flex', gap: 32, fontSize: 22, color: '#99A1A9' }}>
            <span>{dateLine}</span>
            <span>{zoneLine}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.14)',
            paddingTop: 22,
            fontSize: 18,
            color: '#737B84',
          }}
        >
          <span>{wordmark}</span>
          <span>Placeholder preview — official artwork to be supplied</span>
        </div>
      </div>
    ),
    size,
  )
}
