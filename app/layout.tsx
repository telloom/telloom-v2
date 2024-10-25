// app/layout.tsx
// This component serves as the root layout for the entire application

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../app/styles/globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Telloom',
  description: 'Bridging Generations through Video Storytelling',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
