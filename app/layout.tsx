import React from 'react'
import type { Metadata } from 'next'
import '../app/globals.css'

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
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}