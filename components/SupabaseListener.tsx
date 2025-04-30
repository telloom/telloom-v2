/**
 * File: components/SupabaseListener.tsx
 * Description: Component that handles navigation based on authentication state.
 * This component no longer creates its own Supabase client or sets up auth listeners,
 * instead it uses the centralized AuthContext.
 */

'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

type SupabaseListenerProps = {
  serverSession: boolean; // Flag indicating if the server had a valid session
};

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/reset-password',
  '/set-password',
  '/demo',
  '/how-it-works'
];

// Update protected routes to be more precise
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/videos',
  '/meetings',
  '/invitations',
  '/prompts'
];

export default function SupabaseListener({ serverSession }: SupabaseListenerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, setUser, refreshUser } = useAuth();
  const supabase = createClient();
  
  // State to track authentication status and prevent loops
  const [stableAuthState, setStableAuthState] = useState<string | null>(null);
  const lastNavTimestamp = useRef<number>(Date.now());
  const navigating = useRef<boolean>(false);
  const stateChangeCount = useRef<number>(0);
  const serverCheckTimestamp = useRef<number>(0);
  const lastPath = useRef<string | null>(null);
  
  const MAX_RAPID_STATE_CHANGES = 5;
  const MIN_NAV_INTERVAL = 1000; // 1 second minimum between navigations
  const SERVER_CHECK_INTERVAL = 5000; // 5 seconds between server checks
  
  // Function to determine the current route type
  const getRouteType = useCallback(() => {
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    
    // More precise check for protected routes to avoid false positives
    const isProtectedRoute = 
      PROTECTED_ROUTES.some(route => pathname.includes(route)) || 
      (pathname.includes('/role-') && !pathname.includes('/topics'));
    
    return { isPublicRoute, isProtectedRoute };
  }, [pathname]);
  
  // Handle navigation based on authentication state
  const handleNavigation = useCallback(() => {
    const { isPublicRoute, isProtectedRoute } = getRouteType();
    const now = Date.now();
    
    // Don't navigate if we're already on the same path
    if (lastPath.current === pathname) {
      // console.log('[SupabaseListener] Already on path', pathname, 'not navigating');
      return;
    }
    
    // Update the last path we've seen
    lastPath.current = pathname;
    
    // Guard against too frequent navigations
    if (now - lastNavTimestamp.current < MIN_NAV_INTERVAL) {
      // console.log('[SupabaseListener] Navigation attempted too soon, delaying');
      return;
    }
    
    // Don't navigate if auth is still loading
    if (loading) {
      // console.log('[SupabaseListener] Auth still loading, not navigating');
      return;
    }
    
    // Only navigate if we have established a stable auth state
    if (stableAuthState === null) {
      // console.log('[SupabaseListener] Auth state not yet stabilized, not navigating');
      return;
    }
    
    // Handle navigation based on authenticated state and current route
    if (stableAuthState === 'authenticated' && isPublicRoute) {
      // console.log('[SupabaseListener] Authenticated on public route, redirecting to dashboard');
      navigating.current = true;
      lastNavTimestamp.current = now;
      router.replace('/dashboard');
    } else if (stableAuthState === 'unauthenticated' && isProtectedRoute) {
      // console.log('[SupabaseListener] Unauthenticated on protected route, redirecting to login');
      navigating.current = true;
      lastNavTimestamp.current = now;
      router.replace('/login');
    } else {
      // console.log('[SupabaseListener] No navigation needed for current state and route');
    }
    
    // Reset navigating flag after a delay
    setTimeout(() => {
      navigating.current = false;
    }, MIN_NAV_INTERVAL);
  }, [loading, stableAuthState, getRouteType, router, pathname]);
  
  // Detect auth state changes from Supabase
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, changedSession) => {
      // console.log('[SupabaseListener] Auth state changed', { event, session: !!changedSession });
      stateChangeCount.current += 1;
      
      // Only react if not currently navigating
      if (!navigating.current) {
        // Check for rapid state changes that might indicate a loop
        if (stateChangeCount.current > MAX_RAPID_STATE_CHANGES) {
          // console.log('[SupabaseListener] Too many rapid auth state changes, stabilizing');
          return; // Ignore further changes to break the loop
        }
        
        // Handle auth events
        if (event === 'SIGNED_OUT') {
          // console.log('[SupabaseListener] User signed out');
          setUser(null);
          setStableAuthState('unauthenticated');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // console.log('[SupabaseListener] User signed in or token refreshed');
          if (changedSession?.user) {
            setUser(changedSession.user);
            setStableAuthState('authenticated');
          }
        }
        
        // Handle navigation based on current route
        handleNavigation();
      }
    });
    
    // Reset state change counter regularly
    const resetInterval = setInterval(() => {
      stateChangeCount.current = 0;
    }, 10000); // Reset counter every 10 seconds
    
    return () => {
      subscription.unsubscribe();
      clearInterval(resetInterval);
    };
  }, [supabase, setUser, handleNavigation]);
  
  // Check server auth when client indicates no user but server had session
  useEffect(() => {
    const checkServerAuth = async () => {
      // Only check if we need to - client says no user, but server said yes
      if (!user && serverSession && !loading) {
        const now = Date.now();
        
        // Limit frequency of server checks
        if (now - serverCheckTimestamp.current < SERVER_CHECK_INTERVAL) {
          // console.log('[SupabaseListener] Skipping server check - too frequent');
          return;
        }
        
        serverCheckTimestamp.current = now;
        // console.log('[SupabaseListener] Client has no user but server indicated session, verifying...');
        
        try {
          // Check if server still has a session
          const response = await fetch('/api/auth/session');
          const data = await response.json();
          
          // console.log('[SupabaseListener] Server auth check result:', data);
          
          if (data.session?.user?.id) {
            // console.log('[SupabaseListener] Server confirms user, refreshing client...');
            await refreshUser();
            setStableAuthState('authenticated');
          } else {
            // console.log('[SupabaseListener] Server confirms no user');
            setStableAuthState('unauthenticated');
          }
        } catch {
          // console.log('[SupabaseListener] Error checking server auth:', error);
        }
      }
    };
    
    checkServerAuth();
  }, [user, serverSession, loading, refreshUser]);
  
  // Establish initial stable auth state on mount
  useEffect(() => {
    if (!loading) {
      if (user) {
        setStableAuthState('authenticated');
      } else {
        // Only set unauthenticated if server also reports no session
        if (!serverSession) {
          setStableAuthState('unauthenticated');
        } else {
          // Server has session but client doesn't - wait for server check
          // console.log('[SupabaseListener] Client/server auth mismatch on mount, waiting for check');
        }
      }
    }
  }, [user, loading, serverSession]);
  
  // Handle navigation when stable state changes
  useEffect(() => {
    if (stableAuthState !== null) {
      handleNavigation();
    }
  }, [stableAuthState, handleNavigation]);
  
  return null;
}