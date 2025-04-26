// utils/supabase/direct-client.ts
// Server-side Supabase client that uses direct cookies access for route handlers

import { createClient as createClientBase } from '@supabase/supabase-js';

/**
 * Creates a Supabase client that uses direct cookie access
 * For API routes where we don't need to handle cookies
 */
export function createDirectClient() {
  try {
    console.log('[DIRECT_CLIENT] Creating direct Supabase client');
    
    // Create a basic client that doesn't handle cookies
    return createClientBase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } catch (error) {
    console.error('[DIRECT_CLIENT] Error creating Supabase client:', error);
    throw new Error(`Failed to create direct Supabase client: ${error}`);
  }
} 