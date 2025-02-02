// utils/supabase/server.ts
// Server-side Supabase client with SSR support

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  // Await cookies() so that cookieStore is the resolved object.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Synchronous get method after awaiting cookies()
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        // Synchronous set method
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        // Synchronous remove method (using delete as defined on the cookieStore)
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}

export async function getUser() {
  try {
    const supabase = await createClient();
    // Remove unused 'error' from the destructuring
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('[getUser] Unexpected error:', error);
    return null;
  }
}

// Helper function for role-based layouts remains unchanged.
export async function checkRole(requiredRole: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id)
      .single();

    if (rolesError) {
      return false;
    }

    return roles?.role === requiredRole;
  } catch {
    return false;
  }
}