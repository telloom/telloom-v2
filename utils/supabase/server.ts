// utils/supabase/server.ts
// Server-side Supabase client with SSR support

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await cookies();
          cookieStore.set(name, value, options);
        },
        async remove(name: string, _options: CookieOptions) {
          const cookieStore = await cookies();
          cookieStore.delete(name);
        },
      },
    }
  );
}

export async function getUser() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('[getUser] Unexpected error:', error);
    return null;
  }
}

// Helper function for role-based layouts
export async function checkRole(requiredRole: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (rolesError) {
      return false;
    }

    return roles?.some(r => r.role === requiredRole);
  } catch {
    return false;
  }
}