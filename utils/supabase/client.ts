// utils/supabase/client.ts
// Client-side Supabase client with minimal logging

import { createBrowserClient } from '@supabase/ssr';
import { debounce } from 'lodash';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;
let isInitializing = false;
let pendingPromise: Promise<ReturnType<typeof createBrowserClient>> | null = null;

// Create client immediately to ensure it's ready when needed
const createInitialClient = () => {
  if (!supabaseClient) {
    // Override console methods to suppress Supabase logs
    if (process.env.NODE_ENV !== 'development') {
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
      };

      const shouldFilter = (args: any[]) => {
        const str = args[0]?.toString() || '';
        return str.includes('GoTrueClient') || 
               str.includes('supabase') || 
               str.includes('auth state change') ||
               str.includes('INITIAL_SESSION');
      };

      console.log = (...args) => {
        if (!shouldFilter(args)) {
          originalConsole.log.apply(console, args);
        }
      };
      console.info = (...args) => {
        if (!shouldFilter(args)) {
          originalConsole.info.apply(console, args);
        }
      };
      console.warn = (...args) => {
        if (!shouldFilter(args)) {
          originalConsole.warn.apply(console, args);
        }
      };
      console.error = (...args) => {
        if (!shouldFilter(args)) {
          originalConsole.error.apply(console, args);
        }
      };
    }

    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          debug: false
        },
        db: {
          schema: 'public'
        },
        global: {
          fetch: fetch.bind(globalThis)
        }
      }
    );

    // Disable auth state change logging after client creation
    supabaseClient.auth.onAuthStateChange(() => {
      // Empty callback to prevent default logging
    });
  }
  return supabaseClient;
};

// Initialize client immediately
createInitialClient();

// Debounced client creation for subsequent calls
const debouncedCreateClient = debounce(() => {
  if (!supabaseClient && !isInitializing) {
    isInitializing = true;
    pendingPromise = (async () => {
      try {
        const client = createInitialClient();
        return client;
      } catch (error) {
        // Only log critical errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Critical error initializing Supabase client:', error);
        }
        throw error;
      } finally {
        isInitializing = false;
        pendingPromise = null;
      }
    })();
  }
  return pendingPromise || Promise.resolve(supabaseClient!);
}, 100);

export function createClient() {
  if (supabaseClient) return supabaseClient;
  return createInitialClient();
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