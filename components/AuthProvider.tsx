'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Track refresh attempts to prevent infinite loops
interface RefreshState {
  lastAttempt: number;
  count: number;
  inProgress: boolean;
}

// Create context for auth state
const AuthContext = createContext<{
  initialized: boolean;
  user: any | null;
  error: Error | null;
}>({
  initialized: false,
  user: null,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
  serverHasUser = false,
  serverUser = null,
}: {
  children: React.ReactNode;
  serverHasUser?: boolean;
  serverUser?: any;
}) {
  const [user, setUser] = useState<any | null>(serverUser);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);
  // Initialize refresh state
  const [refreshState, setRefreshState] = useState<RefreshState>({
    lastAttempt: 0,
    count: 0,
    inProgress: false,
  });
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Check if we're on an authentication page
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const REFRESH_COOLDOWN = 5000; // 5 seconds between refresh attempts
  const MAX_REFRESH_ATTEMPTS = 3; // Maximum number of consecutive refresh attempts

  useEffect(() => {
    if (!initialized) {
      initializeAuth();
    }
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
          setError(null);
          // Reset refresh attempts on successful auth
          setRefreshState({
            lastAttempt: 0,
            count: 0,
            inProgress: false,
          });
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          if (!isAuthPage) {
            router.push('/login');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized, isAuthPage, router, supabase.auth]);

  // Initialize auth state and handle mismatches between client and server
  const initializeAuth = async () => {
    try {
      console.log('[AUTH] Initializing auth provider');
      
      const { data: { user: clientUser }, error: clientError } = await supabase.auth.getUser();
      
      // Check for mismatch between server and client state
      if (serverHasUser && !clientUser) {
        console.log('[AUTH] Auth state mismatch between client and server:', {
          clientHasUser: Boolean(clientUser),
          serverHasUser,
          clientId: clientUser?.id?.substring(0, 8),
          serverId: serverUser?.id?.substring(0, 8),
        });
        
        // Only attempt refresh if we haven't exceeded limits
        const now = Date.now();
        const canAttemptRefresh = 
          !refreshState.inProgress && 
          (now - refreshState.lastAttempt > REFRESH_COOLDOWN) &&
          (refreshState.count < MAX_REFRESH_ATTEMPTS);
        
        if (canAttemptRefresh) {
          await refreshSession();
        } else if (refreshState.count >= MAX_REFRESH_ATTEMPTS) {
          console.log('[AUTH] Max refresh attempts reached, redirecting to login');
          if (!isAuthPage) {
            router.push('/login');
          }
        }
      } else {
        // Client and server match, set user state
        console.log('[AUTH] Client and server auth states match');
        setUser(clientUser || null);
        setError(clientError || null);
        
        // Navigate to login if not authenticated and not on auth page
        if (!clientUser && !isAuthPage) {
          console.log('[AUTH] No authenticated user, redirecting to login');
          router.push('/login');
        }
      }
      
      setInitialized(true);
    } catch (err) {
      console.error('[AUTH] Error initializing auth:', err);
      setError(err instanceof Error ? err : new Error('Unknown error during auth initialization'));
      setInitialized(true);
    }
  };

  // Handle session refresh with cooldown and attempt tracking
  const refreshSession = async () => {
    // Set refresh in progress to prevent concurrent attempts
    setRefreshState(prev => ({
      ...prev,
      inProgress: true,
      lastAttempt: Date.now(),
      count: prev.count + 1,
    }));
    
    try {
      console.log('[AUTH] Attempting to refresh session');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[AUTH] Error refreshing session:', error.message);
        throw error;
      }
      
      if (!data.session) {
        console.error('[AUTH] No session after refresh');
        throw new Error('No session after refresh');
      }
      
      console.log('[AUTH] Successfully refreshed session');
      setUser(data.user);
      
      // Reset refresh attempts on successful refresh
      setRefreshState({
        lastAttempt: Date.now(),
        count: 0,
        inProgress: false,
      });
      
      return true;
    } catch (err) {
      console.error('[AUTH] Error retrieving user after refresh:', err);
      
      // Mark refresh as complete but keep count and timestamp
      setRefreshState(prev => ({
        ...prev,
        inProgress: false,
      }));
      
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ initialized, user, error }}>
      {children}
    </AuthContext.Provider>
  );
} 