import React from 'react'
import type { Metadata } from 'next'
import '../app/globals.css'
import { Toaster } from "@/components/ui/sonner"

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
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}