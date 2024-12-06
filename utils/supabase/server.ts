// utils/supabase/server.ts

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const createClient = (accessToken?: string) => {
  console.log('Server client - Creating Supabase client');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!accessToken) {
    const cookieStore = cookies();
    accessToken = cookieStore.get('supabase-access-token')?.value ?? '';
    console.log('Server client - Retrieved access token from cookies:', !!accessToken);
  } else {
    console.log('Server client - Using provided access token');
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
      },
    },
  });

  console.log('Server client - Supabase client created');
  return supabase;
};