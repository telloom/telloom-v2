// utils/supabase/client.ts
// Client-side Supabase client

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const createClient = () => {
  // Always create a new client if we're in development to avoid stale auth state
  if (process.env.NODE_ENV === 'development') {
    supabaseClient = null;
  }
  
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase configuration');
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
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
  });

  return supabaseClient;
};

export const getSession = async () => {
  const client = createClient();
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    if (!session) {
      console.warn('No session found');
      return null;
    }
    return session;
  } catch (error) {
    console.error('Unexpected error getting session:', error);
    return null;
  }
};

export const getUser = async () => {
  const session = await getSession();
  return session?.user ?? null;
};