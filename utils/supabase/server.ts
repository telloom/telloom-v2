// File: utils/supabase/server.ts
//
// This module exports a function to create a Supabase client for server-side operations.
// It uses Next.js cookies for session management and handles authentication tokens.

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function supabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();
  const access_token = cookieStore.get('sb-access-token')?.value;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : {},
    },
  });

  return supabase;
}
