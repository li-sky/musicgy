import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import RegisterSW from '@/components/RegisterSW'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Musicgy | Collaborative Listening',
  description: 'A collaborative music listening platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Musicgy',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RegisterSW />
        {children}
      </body>
    </html>
  )
}
