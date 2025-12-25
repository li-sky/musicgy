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
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
