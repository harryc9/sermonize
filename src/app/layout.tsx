import type { Metadata } from 'next'
import { DM_Sans, Lora } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: {
    default: 'Sermonize — Talk to any sermon',
    template: '%s | Sermonize',
  },
  description:
    'Paste a YouTube sermon URL and chat about the details — quotes, verses, themes, and timestamps.',
  metadataBase: new URL('https://sermonize.app'),
  keywords: [
    'sermon',
    'bible',
    'chat',
    'ai',
    'youtube',
    'transcript',
    'preaching',
    'church',
    'scripture',
  ],
  authors: [{ name: 'Sermonize' }],
  creator: 'Sermonize',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Sermonize',
    title: 'Sermonize — Talk to any sermon',
    description:
      'Paste a YouTube sermon URL and chat about the details — quotes, verses, themes, and timestamps.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sermonize — Talk to any sermon',
    description:
      'Paste a YouTube sermon URL and chat about the details — quotes, verses, themes, and timestamps.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${lora.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
