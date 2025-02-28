// utils/supabase/client.ts
// Client-side Supabase client with minimal logging

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;
let resetClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        debug: process.env.NODE_ENV === 'development', // Enable debug in development
        persistSession: true,
        // Completely disable URL detection to prevent automatic redirects
        detectSessionInUrl: false,
        flowType: 'pkce', // Use PKCE flow for better security
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'x-application-name': 'telloom',
        },
      },
    }
  );

  return client;
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
        debug: true, // Enable full debug logging
        persistSession: false, // Don't persist session for reset password flow
        detectSessionInUrl: false, // Completely disable URL detection
        flowType: 'pkce',
        autoRefreshToken: false, // Disable auto refresh for reset password
        // Log all auth state changes but don't take any action
        onAuthStateChange: (event, session) => {
          console.log('[RESET CLIENT DEBUG] Auth state changed:', event, session ? 'Has session' : 'No session', 'at:', new Date().toISOString());
          console.log('[RESET CLIENT DEBUG] Auth state change details:', { event, sessionExists: !!session });
          
          // IMPORTANT: Prevent any redirects on PASSWORD_RECOVERY event
          if (event === 'PASSWORD_RECOVERY') {
            console.log('[RESET CLIENT DEBUG] Intercepted PASSWORD_RECOVERY event, preventing default behavior');
            // Don't do anything with the session - we'll handle it manually
            return;
          }
        },
        // Override the default storage to prevent automatic redirects
        storage: {
          getItem: (key) => {
            console.log('[RESET CLIENT] Getting storage item:', key);
            // For password reset, we don't want to restore any previous session
            if (key.includes('access_token') || key.includes('refresh_token') || key.includes('auth-token')) {
              console.log('[RESET CLIENT] Blocking access to auth token in storage');
              return null;
            }
            const value = localStorage.getItem(key);
            console.log('[RESET CLIENT] Retrieved value for', key, value ? 'exists' : 'is null');
            return value;
          },
          setItem: (key, value) => {
            console.log('[RESET CLIENT] Setting storage item:', key);
            if (key.includes('auth-token')) {
              console.log('[RESET CLIENT] Auth token being set:', value.substring(0, 20) + '...');
            }
            localStorage.setItem(key, value);
          },
          removeItem: (key) => {
            console.log('[RESET CLIENT] Removing storage item:', key);
            localStorage.removeItem(key);
          }
        },
      },
      global: {
        headers: {
          'x-application-name': 'telloom-reset-password',
          'x-client-created': creationTime,
        },
      },
    }
  );
  
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
    resetClient.auth.constructor.prototype._redirect = function() {
      console.log('[RESET CLIENT DEBUG] Redirect attempt blocked at:', new Date().toISOString());
      console.log('[RESET CLIENT DEBUG] Redirect would have gone to:', arguments[0] || 'unknown');
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

// Export singleton instance
export const supabase = createClient();

// Cached user getter with longer expiry
let cachedUser: Awaited<ReturnType<typeof supabase.auth.getUser>> | null = null;
const userExpiryTime = 15 * 60 * 1000; // 15 minutes
let lastUserCheck = 0;

export const getUser = async () => {
  const now = Date.now();
  
  // Return cached user if it's still valid
  if (cachedUser && (now - lastUserCheck) < userExpiryTime) {
    return cachedUser.data.user;
  }

  try {
    const client = createClient();
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error getting user:', error);
      }
      return null;
    }
    
    // Cache the successful response
    cachedUser = { data: { user } };
    lastUserCheck = now;
    
    return user;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected error getting user:', error);
    }
    return null;
  }
};