// utils/supabase/client.ts

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log('Creating Supabase client with URL:', supabaseUrl);

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      storageKey: 'supabase-auth-token',
      storage: {
        getItem: (key) => {
          const value = Cookies.get(key) ?? null;
          console.log(`Getting cookie ${key}:`, value);
          return value;
        },
        setItem: (key, value) => {
          // Parse the session object and store only the access token
          const session = JSON.parse(value);
          const accessToken = session.access_token;
          console.log(`Setting cookie ${key}:`, accessToken);
          Cookies.set(key, accessToken, {
            expires: 1, // Expires in 1 day
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        },
        removeItem: (key) => {
          console.log(`Removing cookie ${key}`);
          Cookies.remove(key);
        },
      },
    },
  });

  return supabase;
}