import React from 'react'
import type { Metadata } from 'next'
import '../app/globals.css'
import { Toaster } from "@/components/ui/sonner"
import { Session, createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState } from 'react';

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
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={supabaseClient} initialSession={undefined}>
          <main>{children}</main>
          <Toaster />
        </SessionContextProvider>
      </body>
    </html>
  )
}