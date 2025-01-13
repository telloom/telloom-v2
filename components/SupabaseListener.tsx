// components/SupabaseListener.tsx

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { Subscription, AuthChangeEvent } from '@supabase/supabase-js';
import { debounce } from 'lodash';

export default function SupabaseListener() {
  const router = useRouter();
  const authListenerRef = useRef<Subscription | null>(null);
  const isHandlingAuthChange = useRef(false);
  const isMounted = useRef(false);
  const supabaseRef = useRef(createClient());

  // Verify user authentication state
  const verifyUser = async () => {
    if (!isMounted.current) return null;
    
    try {
      const { data: { user }, error } = await supabaseRef.current.auth.getUser();
      if (error) {
        console.error('Error verifying user:', error);
        router.push('/login');
        return null;
      }
      return user;
    } catch (error) {
      console.error('Error verifying user:', error);
      router.push('/login');
      return null;
    }
  };

  // Debounced auth change handler to prevent multiple rapid calls
  const debouncedHandleAuthChange = debounce(async () => {
    if (isHandlingAuthChange.current || !isMounted.current) return;
    isHandlingAuthChange.current = true;

    try {
      const user = await verifyUser();
      if (!user) {
        router.push('/login');
      } else {
        router.refresh();
      }
    } finally {
      isHandlingAuthChange.current = false;
    }
  }, 300);

  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        // Initial auth check
        const user = await verifyUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Set up auth listener
        const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
          if (!isMounted.current) return;
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const user = await verifyUser();
            if (user) {
              debouncedHandleAuthChange();
            }
          } else if (event === 'SIGNED_OUT') {
            router.push('/login');
          }
        });

        authListenerRef.current = subscription;
      } catch (error) {
        console.error('Error initializing auth:', error);
        router.push('/login');
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
  }, []); // Empty dependency array since we want this to run once

  return null;
}