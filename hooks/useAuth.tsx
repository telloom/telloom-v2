'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, invalidateUserCache } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { getUserInfoSafely } from '@/utils/supabase/client-helpers';
import { useUserStore } from '@/stores/userStore'; // Import useUserStore
import type { Profile, ProfileRole } from '@/types/models'; // Import the canonical Profile type and ProfileRole

// Remove the local Profile interface definition
// interface Profile {
//   id: string; 
//   fullName: string | null;
//   displayName: string | null;
//   email: string | null;
//   firstName: string | null;
//   lastName: string | null;
//   avatarUrl: string | null;
//   phone: string | null;
//   isAdmin: boolean | null;
//   createdAt: string | null; 
//   updatedAt: string | null;
// }

// Define the shape of our auth context using the imported Profile type
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null; // Use imported Profile type
  loading: boolean; // Combined loading state
  refreshUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void; // Keep for potential external use
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null, // Default to null
  loading: true,
  refreshUser: async () => null,
  signOut: async () => {},
  setUser: () => {},
});

// Provider component that wraps the app and makes auth available
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { profile, setProfile } = useUserStore();
  const [loading, setLoading] = useState(true); // Represents initial auth check + profile load
  
  // Function to fetch profile and role data for a given user ID
  const fetchUserInfoAndSetProfile = useCallback(async (userId: string) => {
    if (!userId) {
      setProfile(null); // Use setProfile from store
      return;
    }
    console.log(`[AUTH_PROVIDER] Fetching user info for: ${userId.substring(0,8)}`);
    try {
      // Use getUserInfoSafely which returns user, profile, roles etc.
      const userInfo = await getUserInfoSafely(); 

      if (userInfo?.profile) {
        console.log('[AUTH_PROVIDER] User info fetched successfully');
        // Combine profile and roles before setting in store
        const combinedProfile: Profile = {
          ...userInfo.profile,
          // Ensure roles is an array, default to empty if not present
          roles: userInfo.roles?.map(roleName => ({ role: roleName })) as ProfileRole[] || [],
        };
        setProfile(combinedProfile);
      } else {
        console.warn('[AUTH_PROVIDER] No profile data found for user:', userId);
        setProfile(null); // Use setProfile from store
      }
    } catch (error) {
      console.error('[AUTH_PROVIDER] Error fetching user info:', error);
      setProfile(null); // Use setProfile from store
    } finally {
      // setLoading(false); // Consider moving setLoading out if initial load handles it
    }
  }, [setProfile]); // Add setProfile from store to dependency array

  // Function to refresh user data using Supabase methods
  const refreshUser = useCallback(async (): Promise<User | null> => {
    console.log('[AUTH_PROVIDER] Refreshing user data via supabase.auth.getUser()');
    setLoading(true);
    setProfile(null); // Clear profile in store while refreshing
    try {
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('[AUTH_PROVIDER] Error during getUser for refresh:', error);
        setUser(null);
        setSession(null);
        setProfile(null); // Clear profile in store
        return null;
      }
      
      setUser(refreshedUser);
      // Refresh session state as well
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      setSession(refreshedSession);
      
      // Fetch profile/roles if user exists after refresh
      if (refreshedUser) {
        await fetchUserInfoAndSetProfile(refreshedUser.id);
      }
       console.log('[AUTH_PROVIDER] User refresh complete:', { 
        hasUser: !!refreshedUser,
        userId: refreshedUser?.id?.substring(0, 8),
      });
      return refreshedUser;
    } catch (error) {
      console.error('[AUTH_PROVIDER] Unexpected error refreshing user:', error);
      setUser(null);
      setSession(null);
      setProfile(null); // Clear profile in store
      return null;
    } finally {
      setLoading(false); // Loading finishes after user and profile fetch attempts
    }
  }, [fetchUserInfoAndSetProfile, setProfile]); // Update dependency
  
  // Function to sign out
  const signOut = async () => {
    try {
      console.log('[AUTH_PROVIDER] Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AUTH_PROVIDER] Error signing out:', error);
      } else {
        // Clear state immediately upon successful sign out
      setUser(null);
        setSession(null);
        setProfile(null); // Clear profile in store
        invalidateUserCache(); // Invalidate client-side cache if needed
        console.log('[AUTH_PROVIDER] User signed out successfully, state cleared.');
      }
    } catch (error) {
      console.error('[AUTH_PROVIDER] Unexpected error during sign out:', error);
      setUser(null);
      setSession(null);
      setProfile(null); // Clear profile in store
    }
  };

  useEffect(() => {
    let isMounted = true;
    // console.log('[AUTH_PROVIDER] Initializing auth state listener');

    // Initial check for session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setSession(session); // Set the session state here
        setLoading(false);
        // console.log('[AUTH_PROVIDER] Initial getSession result:', { hasSession: !!session });
        if (session?.user) {
          // console.log('[AUTH_PROVIDER] Fetching profile for user:', session.user.id);
          fetchUserInfoAndSetProfile(session.user.id); // Use updated fetch function
        }
      }
    }).catch(error => {
      console.error('[AUTH_PROVIDER] Error fetching initial session:', error);
      setLoading(false); // Ensure loading stops on error
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, changedSession) => {
      if (isMounted) {
        setSession(changedSession);
        const changedUser = changedSession?.user ?? null;
        
        // Read profile from store for comparison
        const currentProfile = useUserStore.getState().profile;
        setUser(changedUser);
        
        // Fetch profile/roles when user signs in or session is restored
        if (changedUser && (!currentProfile || changedUser.id !== currentProfile?.id)) { 
          // Ensure we don't double-fetch if initial fetch is still running
          if (!isMounted || event !== 'INITIAL_SESSION') { 
              console.log('[AUTH_PROVIDER] Auth change detected, fetching user info...');
              setLoading(true); // Set loading true during profile fetch triggered by auth change
              await fetchUserInfoAndSetProfile(changedUser.id); // Use updated fetch function
              setLoading(false);
          }
        } else if (!changedUser) {
          // Clear profile if user signs out
          setProfile(null); // Use stable function from store
        }
      }
    });

    return () => {
      console.log('[AUTH_PROVIDER] Unsubscribing auth listener');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserInfoAndSetProfile, setProfile]); // Update dependency 

  // Provide the auth context value to children
  const value: AuthContextType = {
    user,
    session,
    profile, // Expose profile from store
    loading,
    refreshUser,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 