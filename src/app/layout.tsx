import type { Metadata } from 'next'
import { DM_Sans, Lora } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/sidebar'
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
  title: 'Sermonize',
  description: 'Talk to any sermon. Paste a YouTube URL and chat about the details.',
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
          <div className="flex h-dvh">
            <Sidebar />
            <main className="flex flex-1 flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
