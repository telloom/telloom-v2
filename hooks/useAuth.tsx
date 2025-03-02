'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getUser, invalidateUserCache } from '@/utils/supabase/client';
import type { User, AuthChangeEvent } from '@supabase/supabase-js';

// Define the shape of our auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  checkServerSession: () => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
  checkServerSession: async () => {},
});

// Provider component that wraps the app and makes auth available
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Function to refresh user data
  const refreshUser = async () => {
    try {
      console.log('[AUTH_PROVIDER] Refreshing user data');
      // Invalidate cache to ensure fresh data
      invalidateUserCache();
      const user = await getUser();
      console.log('[AUTH_PROVIDER] User refresh result:', { hasUser: !!user });
      setUser(user);
    } catch (error) {
      console.error('[AUTH_PROVIDER] Error refreshing user:', error);
      setUser(null);
    }
  };
  
  // Function to check server-side session
  const checkServerSession = async () => {
    try {
      console.log('[AUTH_PROVIDER] Checking server-side session');
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.log('[AUTH_PROVIDER] Server session check failed');
        return;
      }
      
      const data = await response.json();
      console.log('[AUTH_PROVIDER] Server session check result:', { hasSession: !!data.session });
      
      if (data.session) {
        // If server has a session but client doesn't, refresh the client
        if (!user) {
          console.log('[AUTH_PROVIDER] Server has session but client doesn\'t, refreshing user');
          await refreshUser();
        }
      } else {
        // If server doesn't have a session but client does, clear client
        if (user) {
          console.log('[AUTH_PROVIDER] Server has no session but client does, clearing user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[AUTH_PROVIDER] Error checking server session:', error);
    }
  };
  
  // Function to sign out
  const signOut = async () => {
    try {
      console.log('[AUTH_PROVIDER] Signing out user');
      // Call the API endpoint to clear cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      setUser(null);
      invalidateUserCache();
      console.log('[AUTH_PROVIDER] User signed out successfully');
    } catch (error) {
      console.error('[AUTH_PROVIDER] Error signing out:', error);
    }
  };

  useEffect(() => {
    console.log('[AUTH_PROVIDER] Initializing auth state');
    let mounted = true;

    // Initial user verification
    const verifyUser = async () => {
      try {
        console.log('[AUTH_PROVIDER] Verifying user');
        const user = await getUser();
        console.log('[AUTH_PROVIDER] User verification result:', { hasUser: !!user });
        
        if (mounted) {
          setUser(user);
        }
      } catch (error: any) {
        // Handle AuthSessionMissingError specifically
        if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
          console.log('[AUTH_PROVIDER] No auth session found, user is not authenticated');
          // This is an expected state for unauthenticated users, not an error
        } else {
          console.error('[AUTH_PROVIDER] Error verifying user:', error);
        }
        
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          console.log('[AUTH_PROVIDER] Setting loading to false');
          setLoading(false);
        }
      }
    };

    verifyUser();
    
    // Check server session after initial verification
    const checkSession = async () => {
      await verifyUser();
      if (mounted) {
        await checkServerSession();
      }
    };
    
    checkSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
      console.log('[AUTH_PROVIDER] Auth state changed:', event);
      
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[AUTH_PROVIDER] User signed in or token refreshed');
        invalidateUserCache();
        await verifyUser();
      }
      if (event === 'SIGNED_OUT') {
        console.log('[AUTH_PROVIDER] User signed out');
        setUser(null);
        setLoading(false);
        invalidateUserCache();
      }
    });

    // Cleanup function
    return () => {
      console.log('[AUTH_PROVIDER] Cleaning up auth effect');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Provide the auth context value
  const value = {
    user,
    loading,
    refreshUser,
    signOut,
    checkServerSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
} 