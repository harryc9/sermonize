import { ImageResponse } from 'next/og'

export const alt = 'Sermonize — Talk to any sermon'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 100, marginBottom: 20 }}>🎙️</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#111',
            letterSpacing: '-0.02em',
          }}
        >
          Sermonize
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            marginTop: 16,
          }}
        >
          Talk to any sermon
        </div>
      </div>
    ),
    { ...size }
  )
}
