/**
 * File: components/auth/ResetPasswordForm.tsx
 * Description: Reset password form component that allows users to set a new password.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { createResetPasswordClient } from '@/utils/supabase/client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Add global type for the password reset success flag
declare global {
  interface Window {
    __passwordResetSuccess?: boolean;
    __isResettingPassword?: boolean;
    __verifiedSession?: any;
  }
}

// Password validation schema
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ResetPasswordFormProps {
  preventRedirect?: boolean;
}

export default function ResetPasswordForm({ preventRedirect = false }: ResetPasswordFormProps) {
  console.log('[FORM DEBUG] Component mounting with preventRedirect:', preventRedirect, 'at:', new Date().toISOString());
  
  // Add a timestamp to track when the component first renders
  const mountTimestamp = Date.now();
  console.log('[FORM DEBUG] Component mount timestamp:', mountTimestamp);
  
  // Track if we've already processed the token
  const [tokenProcessed, setTokenProcessed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenType, setTokenType] = useState<string | null>(null);
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [tokenVerified, setTokenVerified] = useState(false);
  const supabaseRef = useRef(null);
  const formInitializedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRequestNewLink, setShowRequestNewLink] = useState(false);
  const [verifiedSession, setVerifiedSession] = useState<any>(null);
  // Add a ref to track if we're in the middle of verification
  const verifyingTokenRef = useRef(false);
  
  // Initialize the success flag if it doesn't exist (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set flags to track password reset state
      if (window.__passwordResetSuccess === undefined) {
        window.__passwordResetSuccess = false;
        console.log('[FORM] Initialized password reset success flag to false');
      }
      
      // Set a flag to indicate we're in the password reset flow
      window.__isResettingPassword = true;
      console.log('[FORM] Set isResettingPassword flag to true');
      
      // Add a history state entry to prevent automatic redirects
      if (window.history && window.history.replaceState) {
        window.history.replaceState(
          { ...window.history.state, __preventRedirect: true },
          document.title,
          window.location.href
        );
        console.log('[FORM] Added preventRedirect flag to history state');
      }
      
      // Clean up function to reset the flag when component unmounts
      return () => {
        // Only reset the flag if we haven't completed the password reset successfully
        // AND we're not in the middle of verification (which causes remounts)
        if (!window.__passwordResetSuccess && !verifyingTokenRef.current) {
          window.__isResettingPassword = false;
          console.log('[FORM] Reset isResettingPassword flag to false on unmount');
        } else {
          console.log('[FORM] Preserving isResettingPassword flag during remount');
        }
      };
    }
  }, []);
  
  // Add a listener to prevent navigation during password reset
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Function to handle beforeunload event
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Only prevent navigation if we're in the middle of resetting password
        // and haven't completed the process yet
        if (window.__isResettingPassword && !window.__passwordResetSuccess && !isSuccess) {
          console.log('[FORM] Preventing navigation during password reset');
          // Standard way to prevent navigation
          e.preventDefault();
          // For older browsers
          e.returnValue = '';
          return '';
        }
      };
      
      // Add the event listener
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up the event listener on unmount
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isSuccess]);
  
  // Log the current URL for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[FORM DEBUG] Current URL on mount:', window.location.href);
    }
  }, []);

  // Helper function to set error message and update debug info
  const setError = (message: string) => {
    console.error('[FORM] Error:', message);
    setErrorMessage(message);
    setHasValidToken(false);
    
    // If the error is related to an invalid token, show the option to request a new link
    if (message.includes('invalid') || message.includes('expired')) {
      setShowRequestNewLink(true);
    }
  };
  
  // Create a Supabase client with URL detection disabled
  // This prevents automatic redirects during the password reset process
  useEffect(() => {
    if (!supabaseRef.current) {
      console.log('[FORM] Creating Supabase client for the first time');
      supabaseRef.current = createResetPasswordClient();
      
      // Add an auth state change listener to prevent redirects
      if (supabaseRef.current) {
        const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
          (event, session) => {
            console.log('[FORM] Auth state change event:', event);
            
            // If we get a PASSWORD_RECOVERY event, prevent any redirects
            if (event === 'PASSWORD_RECOVERY') {
              console.log('[FORM] Intercepted PASSWORD_RECOVERY event, preventing redirects');
              
              // Set our token as verified since we got the event
              if (session) {
                setTokenVerified(true);
                setHasValidToken(true);
                setIsLoading(false);
                setVerifiedSession(session);
                
                // Store the verified session in window for reuse
                if (typeof window !== 'undefined') {
                  window.__verifiedSession = session;
                  
                  // Set a flag to prevent automatic redirects
                  window.__isResettingPassword = true;
                  
                  // Add a history state entry to prevent automatic redirects
                  if (window.history && window.history.replaceState) {
                    window.history.replaceState(
                      { ...window.history.state, __preventRedirect: true },
                      document.title,
                      window.location.href
                    );
                    console.log('[FORM] Added preventRedirect flag to history state during PASSWORD_RECOVERY event');
                  }
                }
              }
            }
            
            // For SIGNED_IN events during password reset, prevent redirects
            if (event === 'SIGNED_IN' && typeof window !== 'undefined' && window.__isResettingPassword) {
              console.log('[FORM] Intercepted SIGNED_IN event during password reset, preventing redirects');
              
              // Don't allow navigation away from the page
              if (window.history && window.history.pushState) {
                window.history.pushState(
                  { ...window.history.state, __preventRedirect: true },
                  document.title,
                  window.location.href
                );
              }
              
              // Return early to prevent default behavior
              return;
            }
          }
        );
        
        // Clean up the subscription when the component unmounts
        return () => {
          subscription.unsubscribe();
        };
      }
    }
  }, []);
  
  const supabase = supabaseRef.current;

  // Form definition
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Verify token and return session if successful
  const verifyToken = async (tokenHash: string, type: string) => {
    console.log('[FORM DEBUG] Verifying token directly:', tokenHash.substring(0, 20) + '...', type, 'at:', new Date().toISOString());
    
    // Set the verifying flag to true to prevent the flag from being reset during remounts
    verifyingTokenRef.current = true;
    
    try {
      // Create a special Supabase client for password reset
      const resetClient = createResetPasswordClient();
      console.log('[FORM DEBUG] Supabase client created for token verification');
      
      // Verify the token
      const { data, error } = await resetClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });
      
      if (error) {
        console.error('[FORM DEBUG] Token verification error:', error);
        verifyingTokenRef.current = false;
        return { verified: false, session: null };
      }
      
      console.log('[FORM DEBUG] Token verification successful:', !!data.session);
      
      // Store the verified session in window for reuse
      if (typeof window !== 'undefined' && data.session) {
        window.__verifiedSession = data.session;
        setVerifiedSession(data.session);
      }
      
      // Keep the verifying flag true for a short time to handle any remounts
      setTimeout(() => {
        verifyingTokenRef.current = false;
      }, 1000);
      
      return { verified: true, session: data.session };
    } catch (error) {
      console.error('[FORM DEBUG] Error during token verification:', error);
      verifyingTokenRef.current = false;
      return { verified: false, session: null };
    }
  };

  // Initialize form and check for valid tokens
  useEffect(() => {
    const initializeForm = async () => {
      console.log('[FORM DEBUG] initializeForm called, tokenProcessed:', tokenProcessed);
      
      if (formInitializedRef.current) {
        console.log('[FORM DEBUG] Form already initialized, skipping at:', Date.now() - mountTimestamp, 'ms after mount');
        return;
      }

      console.log('[FORM DEBUG] Initializing form and checking tokens... preventRedirect:', preventRedirect, 'at:', Date.now() - mountTimestamp, 'ms after mount');
      formInitializedRef.current = true;
      setIsLoading(true);
      setTokenProcessed(true);

      try {
        // Get token from URL parameters
        const searchParams = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : ''
        );
        
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const accessToken = searchParams.get('access_token');
        
        // Log parameters for debugging
        console.log(
          '[FORM DEBUG] URL parameters:',
          tokenHash ? `Has token_hash: ${tokenHash.substring(0, 20)}...` : 'No token_hash',
          type ? `Type: ${type}` : 'No type',
          accessToken ? 'Has access_token' : 'No access_token'
        );

        // Check for token_hash (Supabase PKCE flow)
        if (tokenHash && type === 'recovery') {
          console.log('[FORM DEBUG] Found token_hash in URL with type: recovery');
          setTokenType('token_hash');
          setTokenValue(tokenHash);
          
          // Log token hash prefix for debugging
          if (tokenHash) {
            console.log('[FORM DEBUG] Token hash prefix:', tokenHash.substring(0, 10) + '...');
          }
          
          // Check if we already have a verified session in window
          if (typeof window !== 'undefined' && window.__verifiedSession) {
            console.log('[FORM DEBUG] Using previously verified session');
            setVerifiedSession(window.__verifiedSession);
            setTokenVerified(true);
            setHasValidToken(true);
            setIsLoading(false);
            return;
          }
          
          // Verify the token
          const { verified, session } = await verifyToken(tokenHash, type);
          
          if (verified) {
            setTokenVerified(true);
            setHasValidToken(true);
            setVerifiedSession(session);
            // Make sure to set isLoading to false here
            setIsLoading(false);
            console.log('[FORM DEBUG] Token is valid, showing password reset form');
          } else {
            setErrorMessage('Invalid or expired password reset link. Please request a new one.');
            setIsLoading(false);
          }
        }

        // Handle access_token for older flows
        if (accessToken) {
          console.log('[FORM DEBUG] Found access_token in URL');
          setTokenType('access_token');
          setTokenValue(accessToken);
          setTokenVerified(true);
          setHasValidToken(true);
          setIsLoading(false);
        } else if (!tokenHash || type !== 'recovery') {
          console.log('[FORM DEBUG] No valid token found in URL');
          setError('No valid reset token found. Please request a new password reset link.');
          setHasValidToken(false);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[FORM DEBUG] Error initializing form:', err);
        setError('An unexpected error occurred');
        setIsLoading(false);
      } finally {
        setIsInitializing(false);
      }
    };

    // Add a small delay to ensure URL parameters are fully processed
    setTimeout(() => {
      initializeForm();
    }, 100);
  }, [preventRedirect, tokenProcessed, mountTimestamp]);

  // Handle form submission
  const onSubmit = async (values: PasswordFormValues) => {
    console.log('[FORM DEBUG] Password reset form submitted at:', new Date().toISOString());
    
    if (!hasValidToken || !tokenVerified) {
      console.error('[FORM DEBUG] Attempted to submit form without valid token');
      setError('Invalid or expired reset token. Please request a new password reset link.');
      return;
    }
    
    console.log('[FORM DEBUG] Form submission with token type:', tokenType);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (tokenType === 'token_hash') {
        console.log('[FORM DEBUG] Processing token_hash reset flow');
        
        // For PKCE flow with token_hash
        const supabaseClient = createResetPasswordClient();
        console.log('[FORM DEBUG] Created reset client for password update');
        
        // If we already have a verified session, use it directly
        if (verifiedSession) {
          console.log('[FORM DEBUG] Using previously verified session for password update');
          
          // Update the user's password
          const { error: updateError } = await supabaseClient.auth.updateUser({
            password: values.password
          });
          
          if (updateError) {
            throw new Error(updateError.message);
          }
        } else {
          // This should not happen as we verify during initialization
          console.log('[FORM DEBUG] No verified session found, verifying token again');
          
          // Verify the token and update password in one step
          const { error } = await supabaseClient.auth.verifyOtp({
            token_hash: tokenValue,
            type: 'recovery',
            options: {
              data: {
                password: values.password
              }
            }
          });
          
          if (error) {
            console.error('[FORM DEBUG] Error verifying OTP:', error);
            throw new Error('Failed to verify token: ' + error.message);
          }
        }
      } else if (tokenType === 'access_token') {
        console.log('[FORM DEBUG] Processing access_token reset flow');
        
        // For custom flow with access_token
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: values.password,
            access_token: tokenValue,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[FORM DEBUG] API error response:', errorData);
          throw new Error(errorData.error || 'Failed to reset password');
        }
        
        console.log('[FORM DEBUG] Password reset API call successful');
      } else {
        console.error('[FORM DEBUG] Unknown token type:', tokenType);
        throw new Error('Invalid token type');
      }

      // Password reset successful
      console.log('[FORM DEBUG] Password reset successful, setting success state');
      setIsSuccess(true);
      
      // Set the global flag to allow navigation to login
      if (typeof window !== 'undefined') {
        console.log('[FORM DEBUG] Setting global success flag to allow navigation');
        window.__passwordResetSuccess = true;
        window.__isResettingPassword = false;
      }
      
      // Show success message
      toast.success('Password reset successful! You can now log in with your new password.');
      
      // Only redirect if explicitly allowed
      if (!preventRedirect) {
        console.log('[FORM DEBUG] Will redirect to login page after delay');
        setTimeout(() => {
          console.log('[FORM DEBUG] Redirecting to login page now');
          router.push('/login');
        }, 2000);
      } else {
        console.log('[FORM DEBUG] Redirect prevented by preventRedirect flag');
      }
    } catch (error: any) {
      console.error('[FORM DEBUG] Error during password reset:', error);
      setError(error.message || 'An error occurred while resetting your password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual navigation to login page
  const handleGoToLogin = () => {
    console.log('[FORM] Manual navigation to login page via button click');
    
    if (typeof window !== 'undefined') {
      // Make sure the flag is set to true
      console.log('[FORM] Setting success flag to true before manual navigation');
      window.__passwordResetSuccess = true;
      window.__isResettingPassword = false;
      
      // Add a small delay to ensure the flag is set before navigation
      setTimeout(() => {
        console.log('[FORM] Navigating to login page after flag set');
        router.push('/login');
      }, 100);
    } else {
      // Fallback for SSR (shouldn't happen in practice)
      router.push('/login');
    }
  };

  const handleRequestNewLink = () => {
    console.log('[FORM DEBUG] User requested a new password reset link');
    router.push('/forgot-password');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Validating your reset link...</p>
      </div>
    );
  }

  // Show success message
  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Password Reset Successful</h2>
        <p>Your password has been reset successfully.</p>
        <p>Please click the button below to go to the login page.</p>
        <Button 
          onClick={handleGoToLogin} 
          className="mt-4"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  // Show invalid token message
  if (!hasValidToken) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Invalid Reset Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <Button onClick={() => router.push('/forgot-password')} className="mt-4">
          Request a new reset link
        </Button>
      </div>
    );
  }

  // Show the form
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Reset Your Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          <p>{errorMessage}</p>
          {showRequestNewLink && (
            <div className="mt-4">
              <p className="mb-2 text-sm">The password reset link appears to be invalid or has expired.</p>
              <Button 
                variant="outline" 
                onClick={handleRequestNewLink}
                className="w-full"
              >
                Request a new reset link
              </Button>
            </div>
          )}
        </div>
      )}

      {isSuccess ? (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md">
          <p>Your password has been successfully reset!</p>
          <p className="mt-2 text-sm">You will be redirected to the login page shortly.</p>
          <Button
            onClick={handleGoToLogin}
            className="mt-4 w-full"
          >
            Go to Login
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your new password"
                      {...field}
                      disabled={isSubmitting || !hasValidToken}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
                      {...field}
                      disabled={isSubmitting || !hasValidToken}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !hasValidToken}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </Form>
      )}

      {!hasValidToken && !showRequestNewLink && (
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Having trouble with your reset link?
          </p>
          <Button 
            variant="outline" 
            onClick={handleRequestNewLink}
            className="w-full"
          >
            Request a new reset link
          </Button>
        </div>
      )}

      <div className="text-center text-sm">
        <p className="text-muted-foreground text-xs">
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
} 