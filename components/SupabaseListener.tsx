/**
 * File: components/SupabaseListener.tsx
 * Description: Component that listens for authentication state changes and updates the app accordingly.
 */

'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { Subscription, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { debounce } from 'lodash';

export default function SupabaseListener() {
  const router = useRouter();
  const pathname = usePathname();
  const authListenerRef = useRef<Subscription | null>(null);
  const isHandlingAuthChange = useRef(false);
  const isMounted = useRef(false);
  const supabaseRef = useRef(createClient());

  // Skip auth checks on auth pages and invitation pages
  const isAuthPage =
    pathname?.includes('/login') ||
    pathname?.includes('/signup') ||
    pathname?.includes('/invitation') ||
    pathname?.includes('/check-email') ||
    pathname?.includes('/forgot-password');

  // Wrap verifyUser in useCallback so it can be added as a dependency
  const verifyUser = useCallback(async () => {
    if (!isMounted.current || isAuthPage) return null;

    try {
      // Get session first to ensure we have valid auth state
      const { data: { session }, error: sessionError } =
        await supabaseRef.current.auth.getSession();

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
  }, [isAuthPage]);

  // Wrap debouncedHandleAuthChange in useMemo so it is stable
  const debouncedHandleAuthChange = useMemo(
    () =>
      debounce(async () => {
        if (isHandlingAuthChange.current || !isMounted.current || isAuthPage)
          return;
        isHandlingAuthChange.current = true;

        try {
          const user = await verifyUser();
          // Check if we are in a reset-password flow by looking for our global flag or history state flag
          const inResetFlow =
            typeof window !== 'undefined' &&
            (window.__isResettingPassword === true ||
              window.history.state?.__preventRedirect);

          if (!user && !isAuthPage && !inResetFlow) {
            router.push('/login');
          } else if (user) {
            router.refresh();
          }
        } finally {
          isHandlingAuthChange.current = false;
        }
      }, 300),
    [isAuthPage, router, verifyUser]
  );

  useEffect(() => {
    if (isAuthPage) return; // Skip effect on auth pages

    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        // Initial auth check
        const user = await verifyUser();
        const inResetFlow =
          typeof window !== 'undefined' &&
          (window.__isResettingPassword === true ||
            window.history.state?.__preventRedirect);
        if (!user && !isAuthPage && !inResetFlow) {
          router.push('/login');
          return;
        }

        // Set up auth listener
        const { data: { subscription } } =
          supabaseRef.current.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
              if (!isMounted.current || isAuthPage) return;

              // Check if in reset-password flow before acting on the event
              const inReset =
                typeof window !== 'undefined' &&
                (window.__isResettingPassword === true ||
                  window.history.state?.__preventRedirect);

              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                  if (!inReset) {
                    router.refresh();
                  } else {
                    console.log(
                      '[SUPABASE LISTENER] Reset password flow active, ignoring SIGNED_IN/TOKEN_REFRESHED event.'
                    );
                  }
                }
              } else if (event === 'SIGNED_OUT' && !isAuthPage) {
                if (!inReset) {
                  router.push('/login');
                } else {
                  console.log(
                    '[SUPABASE LISTENER] Reset password flow active, ignoring SIGNED_OUT event.'
                  );
                }
              }
            }
          );

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
  }, [pathname, isAuthPage, router, debouncedHandleAuthChange, verifyUser]);

  return null;
}