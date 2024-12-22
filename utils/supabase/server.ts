// utils/supabase/server.ts
// Server-side Supabase client with SSR support

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            });
          } catch (error) {
            // Cookie operations in Server Components are restricted
            // This can be safely ignored if you have middleware handling auth
            console.debug('Cookie set error (safe to ignore in middleware):', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({
              name,
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            });
          } catch (error) {
            // Cookie operations in Server Components are restricted
            // This can be safely ignored if you have middleware handling auth
            console.debug('Cookie remove error (safe to ignore in middleware):', error);
          }
        },
      },
    }
  );
};

const getUser = async () => {
  const supabase = createClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }
};

export {
  createClient,
  getUser,
};