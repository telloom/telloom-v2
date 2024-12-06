// utils/supabase/client.ts

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Basic client for auth operations
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Client for database operations
export async function getAuthenticatedClient() {
  try {
    // Get the current session from the API
    const response = await fetch('/api/auth/user');
    const { user, error } = await response.json();

    if (!response.ok || error || !user) {
      throw new Error(error?.message || 'Not authenticated');
    }

    // Create a new client with the auth token
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        },
      },
    });
  } catch (error) {
    console.error('Error creating authenticated client:', error);
    throw error;
  }
}