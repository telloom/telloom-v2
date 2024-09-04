import React from 'react'
import type { Metadata } from 'next'
import '../app/globals.css'
import { Toaster } from "@/components/ui/sonner"
import ClientWrapper from './ClientWrapper'

export const metadata: Metadata = {
  title: {
    default: 'Telloom',
    template: '%s | Telloom',
  },
  description: 'Bridging Generations through Video Storytelling',
}

import ClientLayout from './ClientLayout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <ClientLayout>
        <body>
          {children}
          <Toaster />
        </body>
      </ClientLayout>
    </html>
  )
}