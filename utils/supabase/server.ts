// utils/supabase/server.ts
// Server-side Supabase client with SSR support

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await cookies();
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookies in edge functions
          }
        },
        async remove(name: string, options: CookieOptions) {
          const cookieStore = await cookies();
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Handle cookies in edge functions
          }
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development'
      },
      global: {
        headers: {
          'x-client-info': `@supabase/auth-helpers-nextjs/0.0.0`
        }
      },
      db: {
        schema: 'public'
      }
    }
  );
};

export async function getUser() {
  const supabase = createClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Helper function for role-based layouts
export async function checkRole(requiredRole: string) {
  const supabase = createClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return false;
    }

    const { data: roles } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (!roles) {
      return false;
    }

    return roles.some(role => role.role === requiredRole);
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}