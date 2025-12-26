import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Musicgy | Collaborative Listening',
  description: 'A collaborative music listening platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
