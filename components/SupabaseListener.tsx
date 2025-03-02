/**
 * File: components/SupabaseListener.tsx
 * Description: Component that handles navigation based on authentication state.
 * This component no longer creates its own Supabase client or sets up auth listeners,
 * instead it uses the centralized AuthContext.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { debounce } from 'lodash';

export default function SupabaseListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, checkServerSession } = useAuth();
  const isMounted = useRef(false);
  const [isRoleTransition, setIsRoleTransition] = useState(false);
  const previousPathname = useRef(pathname);

  // Skip auth checks on auth pages and invitation pages
  const isAuthPage =
    pathname?.includes('/login') ||
    pathname?.includes('/signup') ||
    pathname?.includes('/invitation') ||
    pathname?.includes('/check-email') ||
    pathname?.includes('/forgot-password');

  // Check if we're in a role transition
  const isSelectRolePage = pathname === '/select-role';
  const isRolePage = 
    pathname?.startsWith('/role-listener') || 
    pathname?.startsWith('/role-sharer') || 
    pathname?.startsWith('/role-executor');

  // Create a debounced navigation function
  const debouncedNavigate = useRef(
    debounce((shouldRedirect: boolean) => {
      if (!isMounted.current) return;
      
      console.log('[SUPABASE_LISTENER] Navigation decision:', { 
        shouldRedirect,
        pathname,
        isAuthPage,
        isRoleTransition,
        userId: user?.id
      });
      
      // Check if we are in a reset-password flow
      const inResetFlow =
        typeof window !== 'undefined' &&
        (window.__isResettingPassword === true ||
          window.history.state?.__preventRedirect);

      console.log('[SUPABASE_LISTENER] Reset flow check:', { inResetFlow });

      // Don't redirect if we're in a role transition
      if (shouldRedirect && !isAuthPage && !inResetFlow && !isRoleTransition) {
        console.log('[SUPABASE_LISTENER] Redirecting to /login');
        router.push('/login');
      }
    }, 300)
  ).current;

  // Effect to detect role transitions
  useEffect(() => {
    // If we're coming from select-role to a role page, or vice versa, mark as transition
    if (
      (previousPathname.current === '/select-role' && isRolePage) ||
      (previousPathname.current?.startsWith('/role-') && isSelectRolePage)
    ) {
      console.log('[SUPABASE_LISTENER] Detected role transition:', {
        from: previousPathname.current,
        to: pathname
      });
      setIsRoleTransition(true);
      
      // Reset transition state after a delay
      // Using a longer timeout to ensure we don't see multiple loading states
      const timeoutId = setTimeout(() => {
        setIsRoleTransition(false);
        console.log('[SUPABASE_LISTENER] Role transition complete');
      }, 2500); // Increased from 1000ms to 2500ms
      
      return () => clearTimeout(timeoutId);
    }
    
    // Update previous pathname
    previousPathname.current = pathname;
  }, [pathname, isRolePage, isSelectRolePage]);

  // Effect to check server session periodically
  useEffect(() => {
    console.log('[SUPABASE_LISTENER] Setting up server session check interval');
    
    // Check server session immediately
    checkServerSession();
    
    // Set up interval to check server session every 30 seconds
    const intervalId = setInterval(() => {
      console.log('[SUPABASE_LISTENER] Checking server session (interval)');
      checkServerSession();
    }, 30000); // 30 seconds
    
    return () => {
      console.log('[SUPABASE_LISTENER] Clearing server session check interval');
      clearInterval(intervalId);
    };
  }, [checkServerSession]);

  useEffect(() => {
    console.log('[SUPABASE_LISTENER] Auth state changed:', {
      hasUser: !!user,
      userId: user?.id,
      loading,
      pathname,
      isAuthPage,
      isRoleTransition
    });
    
    isMounted.current = true;

    // Only handle navigation if not on auth pages and not in role transition
    if (!isAuthPage && !loading && !isRoleTransition) {
      console.log('[SUPABASE_LISTENER] Not on auth page and not loading, checking auth state');
      
      const inResetFlow =
        typeof window !== 'undefined' &&
        (window.__isResettingPassword === true ||
          window.history.state?.__preventRedirect);

      console.log('[SUPABASE_LISTENER] Auth state check:', { 
        hasUser: !!user, 
        userId: user?.id,
        inResetFlow,
        isRoleTransition
      });

      if (!user && !inResetFlow) {
        console.log('[SUPABASE_LISTENER] No user and not in reset flow, calling debouncedNavigate');
        debouncedNavigate(true);
      }
    }

    return () => {
      isMounted.current = false;
      debouncedNavigate.cancel();
    };
  }, [user, loading, isAuthPage, debouncedNavigate, router, pathname, isRoleTransition]);

  return null;
}