import React from 'react'
import type { Metadata } from 'next'
import '../app/globals.css'
import { Toaster } from "sonner"
import { ThemeProvider } from '../components/theme-provider'
import ClientWrapper from './ClientWrapper'

export const metadata: Metadata = {
  title: {
    default: 'Telloom',
    template: '%s | Telloom',
  },
  description: 'Bridging Generations through Video Storytelling',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  )
}