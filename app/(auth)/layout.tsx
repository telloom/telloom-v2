// app/(auth)/layout.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getHeader } from '@/utils/next-cookies-helper';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get headers using our helper functions - making sure to await the Promises
    const url = await getHeader('x-url') || '';
    const resetPasswordHeader = await getHeader('x-reset-password');
    
    console.log('[AUTH LAYOUT] Headers check:', { url, resetPasswordHeader });

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
  } catch (error: any) {
    // Check if the error is a Next.js redirect error
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      console.log('[AUTH LAYOUT] Caught NEXT_REDIRECT, re-throwing...');
      throw error; // Re-throw the redirect error so Next.js can handle it
    }
    
    // Handle other unexpected errors
    console.error('[AUTH LAYOUT] Unexpected non-redirect error:', error);
    // Optionally, render an error UI or redirect to a generic error page
    // For now, let's render children as a fallback, but consider a dedicated error state
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children} 
      </div>
    );
  }
}