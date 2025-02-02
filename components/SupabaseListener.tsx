/**
 * File: components/SupabaseListener.tsx
 * Description: Component that listens for authentication state changes and updates the app accordingly.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { Subscription, AuthChangeEvent } from '@supabase/supabase-js';
import { debounce } from 'lodash';

export default function SupabaseListener() {
  const router = useRouter();
  const pathname = usePathname();
  const authListenerRef = useRef<Subscription | null>(null);
  const isHandlingAuthChange = useRef(false);
  const isMounted = useRef(false);
  const supabaseRef = useRef(createClient());

  // Skip auth checks on auth pages and invitation pages
  const isAuthPage = pathname?.includes('/login') || 
                    pathname?.includes('/signup') || 
                    pathname?.includes('/invitation') ||
                    pathname?.includes('/forgot-password');

  // Verify user authentication state
  const verifyUser = async () => {
    if (!isMounted.current || isAuthPage) return null;
    
    try {
      // Get session first to ensure we have valid auth state
      const { data: { session }, error: sessionError } = await supabaseRef.current.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null;
      }

      if (!session) {
        return null;
      }

      return session.user;
    } catch (error) {
      console.error('Error verifying user:', error);
      return null;
    }
  };

  // Debounced auth change handler to prevent multiple rapid calls
  const debouncedHandleAuthChange = debounce(async () => {
    if (isHandlingAuthChange.current || !isMounted.current || isAuthPage) return;
    isHandlingAuthChange.current = true;

    try {
      const user = await verifyUser();
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user) {
        router.refresh();
      }
    } finally {
      isHandlingAuthChange.current = false;
    }
  }, 300);

  useEffect(() => {
    if (isAuthPage) return; // Skip effect on auth pages
    
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        // Initial auth check
        const user = await verifyUser();
        if (!user && !isAuthPage) {
          router.push('/login');
          return;
        }

        // Set up auth listener
        const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
          if (!isMounted.current || isAuthPage) return;
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              router.refresh();
            }
          } else if (event === 'SIGNED_OUT' && !isAuthPage) {
            router.push('/login');
          }
        });

        authListenerRef.current = subscription;
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (!isAuthPage) {
          router.push('/login');
        }
      }
    };

    initializeAuth();

    return () => {
      debouncedHandleAuthChange.cancel();
      isMounted.current = false;
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, [pathname, isAuthPage, router]); // Add router to dependencies

  return null;
}