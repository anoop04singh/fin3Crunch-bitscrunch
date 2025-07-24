import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import DynamicBackground from '@/components/dynamic-background'

export const metadata: Metadata = {
  title: 'fin3crunch',
  description: 'Tactical command and control system',
  icons: {
    icon: '/logo.png',
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="text-white font-mono antialiased">
        <DynamicBackground>
          <Providers>{children}</Providers>
        </DynamicBackground>
      </body>
    </html>
  )
}