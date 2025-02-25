// utils/supabase/client.ts
// Client-side Supabase client with minimal logging

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        debug: false, // Disable debug logging
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-application-name': 'telloom',
        },
      },
    }
  );

  return client;
}

// Export singleton instance
export const supabase = createClient();

// Cached user getter with longer expiry
let cachedUser: Awaited<ReturnType<typeof supabase.auth.getUser>> | null = null;
const userExpiryTime = 15 * 60 * 1000; // 15 minutes
let lastUserCheck = 0;

export const getUser = async () => {
  const now = Date.now();
  
  // Return cached user if it's still valid
  if (cachedUser && (now - lastUserCheck) < userExpiryTime) {
    return cachedUser.data.user;
  }

  try {
    const client = createClient();
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error getting user:', error);
      }
      return null;
    }
    
    // Cache the successful response
    cachedUser = { data: { user } };
    lastUserCheck = now;
    
    return user;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected error getting user:', error);
    }
    return null;
  }
};