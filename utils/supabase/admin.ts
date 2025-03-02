// File: utils/supabase/admin.ts
// This module exports a function to create a Supabase admin client for server-side operations.

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

export function createAdminClient() {
  // Ensure this is only used in server-side code
  if (typeof window !== 'undefined') {
    throw new Error('This function should only be used on the server');
  }

  console.log('[Admin Client] Creating admin client with environment:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
    nodeEnv: process.env.NODE_ENV
  });

  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    console.log('[Admin Client] Successfully created admin client');
    return client;
  } catch (error: any) {
    console.error('[Admin Client] Error creating admin client:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 3)
    });
    throw error;
  }
}