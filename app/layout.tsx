import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import DynamicBackground from '@/components/dynamic-background'

export const metadata: Metadata = {
  title: 'fin3crunch',
  description: 'complete web3 metrics AI',
  icons: {
    icon: 'favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="text-white font-mono antialiased">
        <DynamicBackground>
          <Providers>{children}</Providers>
        </DynamicBackground>
      </body>
    </html>
  )
}