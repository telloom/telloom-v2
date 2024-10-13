import React from 'react';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../app/styles/globals.css'
import Header from '@/components/Header';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Telloom',
  description: 'Bridging Generations through Video Storytelling',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()

  const profileId = session?.user?.id

  return (
    <html lang="en">
      <body className={inter.className}>
        {profileId && <Header profileId={profileId} />}
        <main>{children}</main>
      </body>
    </html>
  );
}
