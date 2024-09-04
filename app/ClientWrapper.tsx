"use client"

import React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { Toaster } from "@/components/ui/sonner"

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClientComponentClient()

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
      <Toaster />
    </SessionContextProvider>
  )
}
