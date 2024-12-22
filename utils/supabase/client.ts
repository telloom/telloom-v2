// utils/supabase/client.ts
// Client-side Supabase client

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let clientInitPromise: Promise<SupabaseClient> | null = null;

async function initializeClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be created in the browser');
  }

  // Check if we have required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    });
    throw new Error('Missing required Supabase configuration');
  }

  try {
    // Create new client
    console.log('Creating new Supabase client with:', {
      url: supabaseUrl.slice(0, 10) + '...',  // Only log part of the URL for security
      hasAnonKey: !!supabaseAnonKey
    });

    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);

    // Test the client by checking if auth is available
    if (!client.auth) {
      console.error('Supabase client created but auth is not available');
      throw new Error('Invalid Supabase client configuration');
    }

    console.log('Supabase client initialized successfully');
    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
}

export const createClient = () => {
  // Return existing client if available
  if (supabaseClient) {
    return supabaseClient;
  }

  // Create new client if not already initializing
  if (!clientInitPromise) {
    clientInitPromise = initializeClient()
      .then(client => {
        supabaseClient = client;
        return client;
      })
      .catch(error => {
        clientInitPromise = null;
        throw error;
      });
  }

  // Return the existing client or the initialization promise
  return supabaseClient || createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

export { supabase };