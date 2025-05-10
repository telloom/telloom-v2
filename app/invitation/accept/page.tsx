/**
 * File: app/invitation/accept/page.tsx
 * Description: Page component for handling invitation acceptance, supporting both authenticated and unauthenticated users
 */

"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, UserPlus, Loader2, LogIn, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import Logo from '@/components/Logo';
import { Suspense } from 'react';

// Base validation schemas for individual fields
const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Must be at least 2 characters');
const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits');

// Combined validation schema for signup form
const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Login schema
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

type SignupFormData = z.infer<typeof signupSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

interface Invitation {
  id: string;
  sharerId: string;
  inviteeEmail: string;
  role: 'LISTENER' | 'EXECUTOR';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  token: string;
  createdAt: string;
  executorFirstName?: string;
  executorLastName?: string;
  executorPhone?: string;
  executorRelation?: string;
}

interface SharerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

// Define a simple loading component for the Suspense fallback
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-lg">
        Loading invitation details...
      </div>
    </div>
  );
}

// New component to contain the actual page logic and UI
function AcceptInvitationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [sharer, setSharer] = useState<SharerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Form states
  const [signupFormData, setSignupFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  
  const [loginFormData, setLoginFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState<{
    signup: Partial<Record<keyof SignupFormData, string>>;
    login: Partial<Record<keyof LoginFormData, string>>;
  }>({
    signup: {},
    login: {},
  });
  
  const [formLoading, setFormLoading] = useState({
    signup: false,
    login: false,
  });
  
  const supabase = createClient();
  
  // Check if user is authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        console.log('[Auth] User is authenticated:', !!session);
        
        // If user is authenticated, pre-fill email in login form
        if (session?.user?.email) {
          setLoginFormData(prev => ({ ...prev, email: session.user.email! }));
        }
      } catch (error) {
        console.error('[Auth] Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    }
    
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Auto-accept invitation if user is already authenticated
  const handleAutoAccept = useCallback(async (invitationData: Invitation) => {
    if (!isAuthenticated) return;
    
    setAccepting(true);
    
    try {
      console.log('[Accept] Auto-accepting invitation:', invitationData.id);
      
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitationData.id,
          token: invitationData.token,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[Accept] Invitation accepted successfully:', data);
        toast.success('Invitation accepted successfully!');
        const redirectPath = invitationData.role === 'LISTENER' ? '/role-listener/dashboard' : '/role-executor/dashboard';
        console.log(`[Accept] Redirecting to ${redirectPath}`);
        // Force reload to ensure state consistency after role change
        window.location.href = redirectPath;
      } else {
        console.error('[Accept] Error accepting invitation during auto-accept:', data);
        // Handle specific errors returned by the API
         if (data.code === 'ALREADY_ACCEPTED') {
          toast.info('This invitation has already been accepted.');
          const redirectPath = invitationData.role === 'LISTENER' ? '/role-listener/dashboard' : '/role-executor/dashboard';
           console.log(`[Accept] Redirecting to ${redirectPath} as already accepted.`);
           window.location.href = redirectPath; // Redirect anyway
        } else if (data.code === 'EMAIL_MISMATCH') {
          toast.error('Invitation email does not match logged-in user.');
          // Do not redirect, let user handle mismatch (maybe log out?)
          setLoading(false); // Stop loading indicator
          setAccepting(false);
        } else {
           toast.error(data.error || 'Failed to accept invitation.');
           // Auto-accept failed, stop loading indicator
           setLoading(false);
           setAccepting(false);
        }
      }
    } catch (error) {
      console.error('[Accept] Error in auto-accept process:', error);
      toast.error('An unexpected error occurred during auto-accept.');
       setLoading(false); // Stop loading indicator on unexpected error
       setAccepting(false);
    } 
    // Don't set accepting false here, redirect handles leaving the page
  }, [isAuthenticated, setAccepting, setLoading]);
  
  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }
      
      try {
        console.log('[Invitation] Fetching invitation with token:', token);
        
        // Try to find the invitation using our API endpoint
        const response = await fetch(`/api/invitations/find?token=${token}`);
        const data = await response.json();
        
        if (response.ok && data.invitation) {
          console.log('[Invitation] Found invitation:', data.invitation);
          setInvitation(data.invitation);
          
          // Check for executor information
          if (data.invitation.role === 'EXECUTOR' && 
              (data.invitation.executorFirstName || 
               data.invitation.executorLastName || 
               data.invitation.executorPhone)) {
            console.log('[Invitation] Found executor information:', {
              firstName: data.invitation.executorFirstName,
              lastName: data.invitation.executorLastName,
              phone: data.invitation.executorPhone
            });
          }
          
          // Pre-fill forms
          setSignupFormData(prev => ({
            ...prev,
            email: data.invitation.inviteeEmail || '',
            firstName: data.invitation.executorFirstName || '',
            lastName: data.invitation.executorLastName || '',
            phone: data.invitation.executorPhone ? formatPhoneNumber(data.invitation.executorPhone) : ''
          }));
          setLoginFormData(prev => ({ ...prev, email: data.invitation.inviteeEmail || '' }));
          
          if (data.sharer) {
            console.log('[Invitation] Found sharer:', data.sharer);
            setSharer(data.sharer);
          }
          
          // Auto-accept only if the user is *already* authenticated when the page loads
          if (isAuthenticated === true) { // Explicitly check for true, not null
            handleAutoAccept(data.invitation);
          } else {
             setLoading(false); // Set loading false for unauthenticated users after fetch
          }
        } else {
          console.error('[Invitation] Error finding invitation:', data.error);
          setError('Invitation not found or has expired');
          setLoading(false);
        }
      } catch (error) {
        console.error('[Invitation] Error fetching invitation:', error);
        setError('Failed to load invitation details');
        setLoading(false);
      }
    }
    
    // Only run fetch if isAuthenticated status is determined (not null)
    if (token && isAuthenticated !== null) {
      fetchInvitation();
    } else if (!token) {
      setError('No invitation token provided');
      setLoading(false);
    }
  }, [token, isAuthenticated, handleAutoAccept]); // Re-run when isAuthenticated or handleAutoAccept changes
  
  // Handle signup form submission
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(prev => ({ ...prev, signup: true }));
    setFormErrors(prev => ({ ...prev, signup: {} })); // Clear previous errors

    try {
      // Validate form data
      const validationResult = signupSchema.safeParse(signupFormData);
      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        setFormErrors(prev => ({ ...prev, signup: fieldErrors as any }));
        toast.error('Please fix the errors in the form.');
        setFormLoading(prev => ({ ...prev, signup: false }));
        return;
      }

      const { email, password, firstName, lastName, phone } = validationResult.data;

      // --- Add invitationToken to options.data ---
      const signupOptions: { data: Record<string, any> } = {
        data: {
          firstName,
          lastName,
          phone,
        },
      };

      if (token) { // Only add if token exists in the URL
        signupOptions.data.invitationToken = token;
        console.log('[Signup] Including invitationToken in signup data:', token);
      }
      // --- End modification ---

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: signupOptions, // Pass the options object
      });

      if (error) {
        console.error('[Signup] Error during signup:', error.message);
        toast.error(`Signup failed: ${error.message}`);
      } else if (data.user) {
        console.log('[Signup] Signup successful, user created:', data.user.id);
        toast.success('Signup successful! Please check your email to confirm.');
        // Redirect to check-email page, potentially passing token if needed later
        // For now, just redirect. Confirmation step will handle acceptance.
        router.push(`/check-email?invitationToken=${token || ''}`); // Pass token for potential use on check-email page
      } else {
        // Handle case where user exists but is unconfirmed (or other scenarios)
        console.warn('[Signup] Signup call completed but no user object returned. User might need confirmation.', data);
        toast.info('Please check your email to confirm your account.');
        router.push(`/check-email?invitationToken=${token || ''}`); // Redirect anyway
      }
    } catch (error: any) {
      console.error('[Signup] Unexpected error during signup:', error);
      toast.error('An unexpected error occurred during signup.');
    } finally {
      setFormLoading(prev => ({ ...prev, signup: false }));
    }
  };
  
  // Handle login form submission
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors(prev => ({ ...prev, login: {} })); // Clear previous errors

    let parsedData: LoginFormData;
    try {
      parsedData = loginSchema.parse(loginFormData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof LoginFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof LoginFormData] = err.message;
          }
        });
        setFormErrors(prev => ({ ...prev, login: newErrors }));
        toast.error('Please correct the errors in the form');
        return;
      }
       toast.error('An unexpected validation error occurred.');
       return;
    }
    
    setFormLoading(prev => ({ ...prev, login: true }));
    
    try {
      console.log('[Login] Attempting sign in for:', parsedData.email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsedData.email,
        password: parsedData.password,
      });
      
      if (error) {
        console.error('[Login] Supabase signIn error:', error);
        toast.error(error.message || 'Failed to sign in');
        setFormErrors(prev => ({ ...prev, login: { password: ' ' } })); // Indicate invalid credentials without being specific
      } else if (data.user) {
        console.log('[Login] Sign in successful for:', data.user.email);
        toast.success('Signed in successfully');
        // Now try to accept the invitation
        if (invitation) {
          await handleAcceptAfterLogin(invitation);
        } else {
           // Should not happen if fetch worked, but redirect as fallback
          console.warn('[Login] Invitation data missing after successful login. Redirecting to dashboard.');
          router.push('/select-role'); 
        }
      } else {
         console.error('[Login] Unexpected success response without user data:', data);
         toast.error('An unexpected issue occurred during login. Please try again.');
      }
    } catch (error: any) {
      console.error('[Login] Catch block error:', error);
      toast.error(error.message || 'An unexpected error occurred during sign in');
    } finally {
      setFormLoading(prev => ({ ...prev, login: false }));
    }
  };
  
  // Accept invitation after successful login
  const handleAcceptAfterLogin = async (invitationData: Invitation) => {
    setAccepting(true);
    try {
      console.log('[Accept] Accepting invitation after login:', invitationData.id);
      
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitationData.id,
          token: invitationData.token, // Pass token for backend validation if needed
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[Accept] Invitation accepted successfully after login:', data);
        toast.success('Invitation accepted!');
        const redirectPath = invitationData.role === 'LISTENER' ? '/role-listener/dashboard' : '/role-executor/dashboard';
        console.log(`[Accept] Redirecting to ${redirectPath}`);
        window.location.href = redirectPath; // Force reload
      } else {
        console.error('[Accept] Error accepting invitation after login:', data);
        // Handle specific errors
         if (data.code === 'ALREADY_ACCEPTED') {
          toast.info('This invitation has already been accepted.');
           const redirectPath = invitationData.role === 'LISTENER' ? '/role-listener/dashboard' : '/role-executor/dashboard';
           console.log(`[Accept] Redirecting to ${redirectPath} as already accepted.`);
           window.location.href = redirectPath; // Redirect anyway
        } else if (data.code === 'EMAIL_MISMATCH') {
           // This case might happen if they log in with an email different from the invite
          toast.error('The invitation email does not match your logged-in account.');
          // Redirect to a neutral place like select-role or dashboard
          router.push('/select-role');
        } else {
           toast.error(data.error || 'Failed to process invitation after login.');
           router.push('/select-role'); // Redirect to a safe place
        }
      }
    } catch (error) {
      console.error('[Accept] Catch block error during accept after login:', error);
      toast.error('An unexpected error occurred while accepting the invitation.');
      router.push('/select-role');
    } finally {
      setAccepting(false); // Only set false if not redirecting immediately
    }
  };
  
  // Format phone number for display
  const formatPhoneNumber = (input: string) => {
    const cleaned = input.replace(/\D/g, '');
    // Handle common formats like +1XXXXXXXXXX or 1XXXXXXXXXX
    const match = cleaned.match(/^(?:1)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    // Fallback for partial input or other formats
    return input.replace(/\D/g, '').slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };
  
  // Handle signup form input changes
  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    if (name === 'phone') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setSignupFormData(prev => ({ ...prev, [name]: formattedValue }));
    setFormErrors(prev => ({ ...prev, signup: { ...prev.signup, [name]: undefined } })); // Clear error on change
  };
  
  // Handle login form input changes
  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, login: { ...prev.login, [name]: undefined } })); // Clear error on change
  };
  
  // Render loading state
  if (loading || isAuthenticated === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <CardTitle>Loading Invitation</CardTitle>
            <CardDescription>Please wait while we load your invitation details...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-[#1B4332]" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Invitation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-red-500">{error}</p>
            <p className="text-center text-sm text-muted-foreground mt-2">
                This might happen if the invitation link is incorrect or has expired.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline" className="rounded-full">
               <Link href="/">Return to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If user is authenticated and accepting, show loading state
  if (accepting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader className="text-center">
            <CardTitle>Accepting Invitation</CardTitle>
            <CardDescription>Please wait while we process your invitation...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-[#1B4332]" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render invitation details with signup/login forms
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-green-50">
      <Card className="w-full max-w-md border-2 border-[#1B4332] shadow-[8px_8px_0_0_#8fbc55] bg-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-semibold text-[#1B4332]">
            <UserPlus className="h-6 w-6" />
            You&apos;re Invited!
          </CardTitle>
          {invitation?.status === 'ACCEPTED' ? (
             <CardDescription className="text-green-600 font-medium">
               You have already accepted this invitation.
             </CardDescription>
          ) : (
             <CardDescription>
               {sharer ? (sharer.fullName || `${sharer.firstName} ${sharer.lastName}`) : 'Someone'} has invited you to join Telloom as a {invitation?.role?.toLowerCase()}.
             </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {invitation?.status === 'ACCEPTED' ? (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-center font-medium mb-4">Welcome aboard!</p>
              <Button asChild className="rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332] text-white">
                 <Link href="/select-role">Go to Dashboard</Link>
              </Button>
            </div>
          ) : isAuthenticated === false ? ( // Show signup/login toggle only if unauthenticated
            <div className="mt-4">
              {showLoginForm ? (
                // LOGIN FORM
                <>
                  <h3 className="text-lg font-semibold mb-3 text-center text-gray-700">Sign In to Accept</h3>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="login-email" className="text-sm font-medium text-gray-600">
                        Email
                      </label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        value={loginFormData.email}
                        onChange={handleLoginInputChange}
                        required
                        className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                        placeholder="your@email.com"
                      />
                      {formErrors.login.email && (
                        <p className="text-xs text-red-500">{formErrors.login.email}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                         <label htmlFor="login-password" className="text-sm font-medium text-gray-600">
                          Password
                        </label>
                        <Link href="/forgot-password" className="text-xs text-[#1B4332] hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        value={loginFormData.password}
                        onChange={handleLoginInputChange}
                        required
                        className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                        placeholder="••••••••"
                      />
                      {formErrors.login.password && (
                        <p className="text-xs text-red-500">{formErrors.login.password || ' '}</p> // Add space to maintain height
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332] text-white transition-colors"
                      disabled={formLoading.login}
                    >
                      {formLoading.login ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</>
                      ) : (
                        <><LogIn className="mr-2 h-4 w-4" />Sign In & Accept</>
                      )}
                    </Button>
                  </form>
                  <p className="text-center text-xs mt-4 text-gray-500">
                     Don&apos;t have an account?{' '}
                    <button onClick={() => setShowLoginForm(false)} className="font-medium text-[#1B4332] hover:underline">
                      Create one now
                    </button>
                  </p>
                </>
              ) : (
                // SIGNUP FORM
                <>
                   <h3 className="text-lg font-semibold mb-3 text-center text-gray-700">Create Account to Accept</h3>
                   {invitation?.role === 'EXECUTOR' && (invitation?.executorFirstName || invitation?.executorLastName || invitation?.executorPhone) && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                      <p>
                        <span className="font-medium">Note:</span> This form may be pre-filled with details provided by the person who invited you. You can edit them if needed.
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-1">
                       <label htmlFor="signup-email" className="text-sm font-medium text-gray-600">
                        Email (Invited)
                      </label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        value={signupFormData.email}
                        readOnly // Email is read-only based on invitation
                        className="h-9 rounded-full bg-gray-100 border-gray-300 cursor-not-allowed"
                      />
                       <p className="text-xs text-gray-500">This email address cannot be changed.</p>
                       {formErrors.signup.email && (
                        <p className="text-xs text-red-500">{formErrors.signup.email}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="firstName" className="text-sm font-medium text-gray-600">
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={signupFormData.firstName}
                          onChange={handleSignupInputChange}
                          required
                          className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                          placeholder="Your first name"
                        />
                         {formErrors.signup.firstName && (
                          <p className="text-xs text-red-500">{formErrors.signup.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="lastName" className="text-sm font-medium text-gray-600">
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={signupFormData.lastName}
                          onChange={handleSignupInputChange}
                          required
                          className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                          placeholder="Your last name"
                        />
                        {formErrors.signup.lastName && (
                          <p className="text-xs text-red-500">{formErrors.signup.lastName}</p>
                        )}
                      </div>
                    </div>
                     <div className="space-y-1">
                      <label htmlFor="phone" className="text-sm font-medium text-gray-600">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={signupFormData.phone}
                        onChange={handleSignupInputChange}
                        required
                        className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                        placeholder="(123) 456-7890"
                        maxLength={14} // Limit length for formatting
                      />
                       {formErrors.signup.phone && (
                        <p className="text-xs text-red-500">{formErrors.signup.phone}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="password" className="text-sm font-medium text-gray-600">
                        Password
                      </label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={signupFormData.password}
                        onChange={handleSignupInputChange}
                        required
                        className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                        placeholder="Create a password"
                      />
                       {formErrors.signup.password && (
                        <p className="text-xs text-red-500">{formErrors.signup.password}</p>
                      )}
                    </div>
                     <div className="space-y-1">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-600">
                        Confirm Password
                      </label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={signupFormData.confirmPassword}
                        onChange={handleSignupInputChange}
                        required
                        className="h-9 rounded-full border-gray-300 focus:border-[#1B4332] focus:ring-[#8fbc55]"
                        placeholder="Confirm your password"
                      />
                      {formErrors.signup.confirmPassword && (
                        <p className="text-xs text-red-500">{formErrors.signup.confirmPassword}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332] text-white transition-colors"
                      disabled={formLoading.signup}
                    >
                      {formLoading.signup ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</>
                      ) : (
                        <><UserCircle className="mr-2 h-4 w-4" />Create Account & Accept</>
                      )}
                    </Button>
                  </form>
                   <p className="text-center text-xs mt-4 text-gray-500">
                    Already have an account?{' '}
                    <button onClick={() => setShowLoginForm(true)} className="font-medium text-[#1B4332] hover:underline">
                      Sign In
                    </button>
                  </p>
                </>
              )}
            </div>
          ) : (
             // If authenticated but not accepting (edge case, maybe after failed auto-accept)
             <div className="text-center mt-4">
                 <p className="text-sm text-muted-foreground mb-3">You are signed in. We tried to accept the invitation automatically.</p>
                 <Button 
                     onClick={() => handleAutoAccept(invitation!)} // Retry manual accept
                     className="rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332] text-white"
                     disabled={accepting}
                 >
                    {accepting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Accept Invitation Now'}
                 </Button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// The main page component, now simplified to use Suspense
export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInvitationPageContent />
    </Suspense>
  );
} 