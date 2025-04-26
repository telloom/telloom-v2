// utils/supabase/client.ts
// Client-side Supabase client with minimal logging

import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

let client: ReturnType<typeof createBrowserClient> | null = null;
let resetClient: ReturnType<typeof createBrowserClient> | null = null;

// Cache for user data to reduce redundant network requests
let cachedUserData: UserCache | null = null;
let lastUserCheck = 0;
const USER_CACHE_DURATION = 30 * 1000; // 30 seconds cache (reduced from 2 minutes)

// Storage for cached user data
type UserCache = {
  user: User | null;
  timestamp: number;
};

// Get cached user data if valid
function getUserCache(): User | null {
  if (!cachedUserData) return null;
  
  const now = Date.now();
  if (now - cachedUserData.timestamp > USER_CACHE_DURATION) {
    return null; // Cache expired
  }
  
  return cachedUserData.user;
}

// Set user data in cache
function setUserCache(user: User): void {
  cachedUserData = {
    user,
    timestamp: Date.now()
  };
}

// Clear auth cookies from the browser
function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;

  // Clear common Supabase auth cookies
  const cookiesToClear = [
    'supabase-auth-token',
    'sb-access-token',
    'sb-refresh-token',
    'sb:token',
    'sb-provider-token',
    'sb-auth-token'
  ];
  
  cookiesToClear.forEach(cookieName => {
    document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure;`;
  });
}

/**
 * Invalidates the user cache, forcing the next getUser() call to fetch fresh data.
 * Call this after operations that might change the user's state.
 */
export function invalidateUserCache() {
  console.log('[AUTH] Invalidating user cache');
  cachedUserData = null;
  
  // Also attempt to clear cookies - this is a belt and suspenders approach
  // for clients that might have stale cookie data
  try {
    // Non-critical functions - shouldn't throw but wrapped in try/catch to be safe
    clearAuthCookies();
  } catch (e) {
    console.error('[AUTH] Error clearing cookies during cache invalidation:', e);
  }
}

/**
 * Creates a Supabase client for client-side usage.
 * NOTE: For most use cases, import the singleton instance exported as 'supabase' 
 * instead of calling this function directly.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Creates a special Supabase client for password reset that completely disables URL detection
 * to prevent automatic redirects during the password reset process.
 */
export function createResetPasswordClient() {
  console.log('[RESET CLIENT DEBUG] Creating special reset password client for PKCE flow at:', new Date().toISOString());
  
  // Return existing instance if already created to prevent multiple instances
  if (resetClient) {
    console.log('[RESET CLIENT DEBUG] Returning existing reset client instance created at:', new Date().toISOString());
    return resetClient;
  }
  
  // Track when this client was created
  const creationTime = new Date().toISOString();
  console.log('[RESET CLIENT DEBUG] Creating new client instance at:', creationTime);
  
  // Create a completely isolated client for password reset
  resetClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false, // Don't persist session for reset password flow
        detectSessionInUrl: false, // Completely disable URL detection
        flowType: 'pkce',
        autoRefreshToken: false, // Disable auto refresh for reset password
      },
      global: {
        headers: {
          'x-application-name': 'telloom-reset-password',
          'x-client-created': creationTime,
        },
      },
    }
  );
  
  // Set up auth state change listener for reset client
  resetClient.auth.onAuthStateChange((event, session) => {
    console.log('[RESET CLIENT DEBUG] Auth state changed:', event, session ? 'Has session' : 'No session', 'at:', new Date().toISOString());
    console.log('[RESET CLIENT DEBUG] Auth state change details:', { event, sessionExists: !!session });
    
    // IMPORTANT: Prevent any redirects on PASSWORD_RECOVERY event
    if (event === 'PASSWORD_RECOVERY') {
      console.log('[RESET CLIENT DEBUG] Intercepted PASSWORD_RECOVERY event, preventing default behavior');
      // Don't do anything with the session - we'll handle it manually
      return;
    }
  });
  
  // Patch the client to log all auth operations
  const originalVerifyOtp = resetClient.auth.verifyOtp;
  resetClient.auth.verifyOtp = async (...args) => {
    console.log('[RESET CLIENT DEBUG] Verifying OTP with args:', JSON.stringify(args), 'at:', new Date().toISOString());
    try {
      // For PKCE flow with token_hash, we need to ensure we're using the correct parameters
      if (args[0] && args[0].token_hash && args[0].type === 'recovery') {
        console.log('[RESET CLIENT DEBUG] Processing token_hash for password recovery:', args[0].token_hash.substring(0, 20) + '...');
        console.log('[RESET CLIENT DEBUG] Current URL during token verification:', window.location.href);
      }
      
      const result = await originalVerifyOtp.apply(resetClient.auth, args);
      console.log('[RESET CLIENT DEBUG] OTP verification result:', result.error ? 'Error' : 'Success', result);
      
      // Log detailed information about the result
      if (result.error) {
        console.error('[RESET CLIENT DEBUG] OTP verification error details:', result.error);
      } else if (result.data && result.data.session) {
        console.log('[RESET CLIENT DEBUG] OTP verification created session:', !!result.data.session);
      }
      
      return result;
    } catch (error) {
      console.error('[RESET CLIENT DEBUG] Error during OTP verification:', error);
      throw error;
    }
  };
  
  const originalSetSession = resetClient.auth.setSession;
  resetClient.auth.setSession = async (...args) => {
    console.log('[RESET CLIENT] Setting session with args:', JSON.stringify(args));
    try {
      const result = await originalSetSession.apply(resetClient.auth, args);
      console.log('[RESET CLIENT] Set session result:', result.error ? 'Error' : 'Success', result);
      return result;
    } catch (error) {
      console.error('[RESET CLIENT] Error during setSession:', error);
      throw error;
    }
  };
  
  const originalUpdateUser = resetClient.auth.updateUser;
  resetClient.auth.updateUser = async (...args) => {
    console.log('[RESET CLIENT] Updating user with args:', JSON.stringify(args[0]));
    try {
      const result = await originalUpdateUser.apply(resetClient.auth, args);
      console.log('[RESET CLIENT] Update user result:', result.error ? 'Error' : 'Success', result);
      return result;
    } catch (error) {
      console.error('[RESET CLIENT] Error during updateUser:', error);
      throw error;
    }
  };
  
  // Completely disable the _redirect method to prevent any redirects
  if (resetClient.auth.constructor.prototype._redirect) {
    console.log('[RESET CLIENT DEBUG] Completely disabling _redirect method');
    resetClient.auth.constructor.prototype._redirect = function(...args) {
      console.log('[RESET CLIENT DEBUG] Redirect attempt blocked at:', new Date().toISOString());
      console.log('[RESET CLIENT DEBUG] Redirect would have gone to:', args[0] || 'unknown');
      return;
    };
  }
  
  // Disable the _handleProviderSignIn method to prevent redirects
  if (resetClient.auth.constructor.prototype._handleProviderSignIn) {
    console.log('[RESET CLIENT DEBUG] Disabling _handleProviderSignIn method');
    resetClient.auth.constructor.prototype._handleProviderSignIn = function() {
      console.log('[RESET CLIENT DEBUG] Provider sign-in attempt blocked');
      return Promise.resolve({ data: null, error: null });
    };
  }
  
  // For PKCE flow, we need to allow _detectSessionInUrl to run for token_hash verification
  // but we'll patch it to be more controlled
  if (resetClient.auth.constructor.prototype._detectSessionInUrl) {
    console.log('[RESET CLIENT DEBUG] Patching _detectSessionInUrl method for PKCE flow');
    const original_detectSessionInUrl = resetClient.auth.constructor.prototype._detectSessionInUrl;
    resetClient.auth.constructor.prototype._detectSessionInUrl = function() {
      // Only allow this method to run if we're on the reset-password page with token_hash
      if (typeof window !== 'undefined' && 
          window.location.pathname.includes('/reset-password') && 
          window.location.search.includes('token_hash')) {
        console.log('[RESET CLIENT DEBUG] Allowing _detectSessionInUrl for password reset token_hash at:', new Date().toISOString());
        console.log('[RESET CLIENT DEBUG] Current URL:', window.location.href);
        
        // Call the original method but intercept any redirect attempts
        const result = original_detectSessionInUrl.apply(this);
        
        // After verification, prevent any automatic redirects
        if (this._notifyAllSubscribers) {
          const originalNotify = this._notifyAllSubscribers;
          this._notifyAllSubscribers = function(event, session) {
            console.log('[RESET CLIENT DEBUG] Intercepted notification:', event);
            
            // Only allow the PASSWORD_RECOVERY event to be broadcast
            // but prevent any side effects like redirects
            if (event === 'PASSWORD_RECOVERY') {
              console.log('[RESET CLIENT DEBUG] Allowing PASSWORD_RECOVERY event but preventing redirects');
              // We still want to broadcast the event but prevent redirects
              return originalNotify.apply(this, [event, session]);
            }
            
            // For other events, proceed normally
            return originalNotify.apply(this, [event, session]);
          };
        }
        
        return result;
      }
      
      console.log('[RESET CLIENT DEBUG] Blocked _detectSessionInUrl from running at:', new Date().toISOString());
      return Promise.resolve({ data: { session: null }, error: null });
    };
  }
  
  // Patch the internal _recoverAndRefresh method to ensure it doesn't restore sessions
  if (resetClient.auth.constructor.prototype._recoverAndRefresh) {
    console.log('[RESET CLIENT] Patching _recoverAndRefresh method');
    resetClient.auth.constructor.prototype._recoverAndRefresh = function() {
      console.log('[RESET CLIENT] Blocked _recoverAndRefresh from running');
      return Promise.resolve();
    };
  }
  
  // Patch the internal _startAutoRefresh method to prevent token refreshes
  if (resetClient.auth.constructor.prototype._startAutoRefresh) {
    console.log('[RESET CLIENT] Patching _startAutoRefresh method');
    resetClient.auth.constructor.prototype._startAutoRefresh = function() {
      console.log('[RESET CLIENT] Blocked _startAutoRefresh from running');
      return;
    };
  }
  
  // Patch the internal _autoRefreshTokenTick method to prevent token refreshes
  if (resetClient.auth.constructor.prototype._autoRefreshTokenTick) {
    console.log('[RESET CLIENT] Patching _autoRefreshTokenTick method');
    resetClient.auth.constructor.prototype._autoRefreshTokenTick = function() {
      console.log('[RESET CLIENT] Blocked _autoRefreshTokenTick from running');
      return Promise.resolve();
    };
  }
  
  // Patch the internal _notifyAllSubscribers method to log all notifications
  if (resetClient.auth.constructor.prototype._notifyAllSubscribers) {
    console.log('[RESET CLIENT] Patching _notifyAllSubscribers method');
    const originalNotifyAllSubscribers = resetClient.auth.constructor.prototype._notifyAllSubscribers;
    resetClient.auth.constructor.prototype._notifyAllSubscribers = function(event, session) {
      console.log('[RESET CLIENT] _notifyAllSubscribers called with event:', event);
      console.log('[RESET CLIENT] _notifyAllSubscribers session:', session ? 'Has session' : 'No session');
      
      // For PASSWORD_RECOVERY events, we want to prevent any redirects
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[RESET CLIENT] Intercepted PASSWORD_RECOVERY event in _notifyAllSubscribers');
        // Still notify subscribers but don't trigger redirects
        return originalNotifyAllSubscribers.apply(this, [event, session]);
      }
      
      return originalNotifyAllSubscribers.apply(this, [event, session]);
    };
  }
  
  // Patch the internal _handleVisibilityChange method to prevent auto refresh
  if (resetClient.auth.constructor.prototype._handleVisibilityChange) {
    console.log('[RESET CLIENT] Patching _handleVisibilityChange method');
    resetClient.auth.constructor.prototype._handleVisibilityChange = function() {
      console.log('[RESET CLIENT] Blocked _handleVisibilityChange from running');
      return;
    };
  }
  
  // Patch the internal _onVisibilityChanged method to prevent auto refresh
  if (resetClient.auth.constructor.prototype._onVisibilityChanged) {
    console.log('[RESET CLIENT] Patching _onVisibilityChanged method');
    resetClient.auth.constructor.prototype._onVisibilityChanged = function() {
      console.log('[RESET CLIENT] Blocked _onVisibilityChanged from running');
      return;
    };
  }
  
  // Patch any navigate methods
  if (resetClient.auth.constructor.prototype._navigate) {
    console.log('[RESET CLIENT] Patching _navigate method');
    resetClient.auth.constructor.prototype._navigate = function() {
      console.log('[RESET CLIENT] Blocked _navigate from running');
      return;
    };
  }
  
  // Patch any URL handling methods
  if (resetClient.auth.constructor.prototype._handleUrlChange) {
    console.log('[RESET CLIENT] Patching _handleUrlChange method');
    resetClient.auth.constructor.prototype._handleUrlChange = function() {
      console.log('[RESET CLIENT] Blocked _handleUrlChange from running');
      return;
    };
  }
  
  // Ensure the client doesn't try to redirect
  if (resetClient.auth.signInWithOtp) {
    const originalSignInWithOtp = resetClient.auth.signInWithOtp;
    resetClient.auth.signInWithOtp = async (params) => {
      // Remove any redirectTo params
      const cleanParams = { ...params, options: { ...params.options, redirectTo: undefined } };
      console.log('[RESET CLIENT] signInWithOtp called with cleaned params:', cleanParams);
      return originalSignInWithOtp.call(resetClient.auth, cleanParams);
    };
  }
  
  console.log('[RESET CLIENT] Reset client created with all redirects disabled');
  return resetClient;
}

// Export singleton instance - USE THIS INSTEAD OF CALLING createClient() DIRECTLY
export const supabase = createClient();

/**
 * Forces a refresh of the user's session and returns fresh user data
 * @returns The refreshed session data
 */
export const refreshSession = async () => {
  try {
    const startTime = Date.now();
    console.log('[AUTH] Refreshing session');
    
    // First check the server API endpoint for definitive session status
    const serverCheckResponse = await fetch('/api/auth/session');
    const serverData = await serverCheckResponse.json();
    
    console.log('[AUTH] Server session check result:', { 
      hasServerSession: !!serverData.session?.user,
      responseTime: `${Date.now() - startTime}ms` 
    });
    
    // If server indicates user is authenticated, make Supabase client match that state
    const { data: { session }, error } = await supabase.auth.getSession();
    
    const userId = session?.user?.id;
    const serverUserId = serverData.session?.user?.id;
    
    // Log any discrepancies between client and server auth state
    if (!!userId !== !!serverUserId) {
      console.warn('[AUTH] Auth state mismatch between client and server:', {
        clientHasUser: !!userId,
        serverHasUser: !!serverUserId,
        clientId: userId?.substring(0, 8),
        serverId: serverUserId?.substring(0, 8)
      });
    }
    
    // If we have a server session but no client session, force a refresh
    if (serverData.session?.user && !session) {
      console.log('[AUTH] Server has session but client does not - force refreshing');
      await supabase.auth.refreshSession();
    }
    
    return {
      hasSession: !!session || !!serverData.session?.user,
      sessionUserId: userId || serverData.session?.user?.id || null,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error('[AUTH] Error refreshing session:', e);
    return {
      hasSession: false,
      sessionUserId: null,
      error: e instanceof Error ? e.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Gets the current user, with caching for performance
 * @param forceRefresh Whether to skip the cache and force a fresh fetch
 * @returns User data or null if not authenticated
 */
export const getUser = async (forceRefresh = false): Promise<User | null> => {
  // Skip cache immediately if forced
  if (forceRefresh) {
    console.log('[AUTH] Cache invalid or force refresh requested, fetching fresh user data');
    
    // Check server session first for definitive answer
    try {
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      console.log('[AUTH] Server session check for getUser:', {
        hasServerUser: !!sessionData.session?.user
      });
      
      // If server says no user, respect that decision
      if (!sessionData.session?.user) {
        console.log('[AUTH] Server confirms no authenticated user');
        invalidateUserCache();
        return null;
      }
    } catch (error) {
      console.error('[AUTH] Error checking server session:', error);
      // Continue with client check as fallback
    }
    
    try {
      // Refresh session before getting user
      const sessionStatus = await refreshSession();
      console.log('[AUTH] Session refresh result:', sessionStatus);
      
      // If refresh indicates no session, return null
      if (!sessionStatus.hasSession) {
        console.log('[AUTH] No session after refresh, returning null');
        invalidateUserCache();
        return null;
      }
      
      // Explicitly refresh auth token for good measure
      console.log('[AUTH] Explicitly refreshing auth token');
      await supabase.auth.refreshSession();
      
      // Get fresh user data
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[AUTH] Error retrieving user after refresh:', error.message);
        invalidateUserCache();
        return null;
      }
      
      if (!user) {
        console.log('[AUTH] No user returned after session refresh');
        invalidateUserCache();
        return null;
      }
      
      // Cache the user data
      console.log('[AUTH] User data retrieved successfully:', { 
        userId: user?.id, 
        email: user?.email?.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });

      setUserCache(user);
      console.log('[AUTH] User data cached with TTL:', USER_CACHE_DURATION / 1000, 'seconds');

      return user;
    } catch (error) {
      console.error('[AUTH] Critical error in getUser with force refresh:', error);
      invalidateUserCache();
      return null;
    }
  }
  
  // If not forcing refresh, use the rest of the original function...
}