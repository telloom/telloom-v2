// utils/supabase/server.ts

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const cookieStore = cookies();
  const access_token = cookieStore.get('supabase-access-token')?.value;

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    global: {
      headers: access_token 
        ? { Authorization: `Bearer ${access_token}` }
        : {},
    },
  });

  return supabase;
};