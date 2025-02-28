// app/(auth)/layout.tsx
"use server";

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Await headers() to retrieve the Headers object
    const headersList = await headers();
    const url = headersList.get('x-url') || '';
    const resetPasswordHeader = headersList.get('x-reset-password');

    // Check if we're in the reset-password flow via header or URL
    if ((resetPasswordHeader === 'true') || (url.includes('/reset-password') && url.includes('token_hash'))) {
      console.log('[AUTH LAYOUT] Detected reset-password flow (x-reset-password header or URL token present). Skipping redirect.');
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          {children}
        </div>
      );
    }

    // If there's a user, redirect to select-role
    if (user) {
      console.log('[AUTH LAYOUT] User is logged in, redirecting to select-role');
      redirect('/select-role');
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children}
      </div>
    );
  } catch (error) {
    console.error('Unexpected error in auth layout:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children}
      </div>
    );
  }
}