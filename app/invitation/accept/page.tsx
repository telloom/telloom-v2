/**
 * File: app/invitation/accept/page.tsx
 * Description: Page component for handling invitation acceptance, supporting both authenticated and unauthenticated users
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, UserPlus, Loader2, LogIn, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import Logo from '@/components/Logo';

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

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [sharer, setSharer] = useState<SharerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('signup');
  
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
  }, []);
  
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
          
          // Pre-fill email in both forms
          setSignupFormData(prev => ({ 
            ...prev, 
            email: data.invitation.inviteeEmail,
            // Prepopulate executor information if available
            ...(data.invitation.executorFirstName && { firstName: data.invitation.executorFirstName }),
            ...(data.invitation.executorLastName && { lastName: data.invitation.executorLastName }),
            ...(data.invitation.executorPhone && { phone: formatPhoneNumber(data.invitation.executorPhone) })
          }));
          setLoginFormData(prev => ({ ...prev, email: data.invitation.inviteeEmail }));
          
          if (data.sharer) {
            console.log('[Invitation] Found sharer:', data.sharer);
            setSharer(data.sharer);
          }
          
          setLoading(false);
          
          // If user is already authenticated, try to accept the invitation automatically
          if (isAuthenticated) {
            handleAutoAccept(data.invitation);
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
    
    if (token) {
      fetchInvitation();
    } else {
      setError('No invitation token provided');
      setLoading(false);
    }
  }, [token, isAuthenticated]);
  
  // Auto-accept invitation if user is already authenticated
  const handleAutoAccept = async (invitationData: Invitation) => {
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
        
        // Redirect to the appropriate page based on role
        if (invitationData.role === 'LISTENER') {
          // Use window.location.href to force a full page reload
          window.location.href = `/role-listener/dashboard`;
        } else {
          // Use window.location.href to force a full page reload
          window.location.href = `/role-executor/dashboard`;
        }
      } else {
        console.error('[Accept] Error accepting invitation:', data);
        
        if (data.code === 'EMAIL_MISMATCH') {
          toast.error('The invitation was sent to a different email address');
        } else if (data.code === 'ALREADY_ACCEPTED') {
          toast.success('This invitation has already been accepted');
          
          // Redirect to the appropriate page based on role
          if (invitationData.role === 'LISTENER') {
            // Use window.location.href to force a full page reload
            window.location.href = `/role-listener/dashboard`;
          } else {
            // Use window.location.href to force a full page reload
            window.location.href = `/role-executor/dashboard`;
          }
        } else {
          // Don't set error, just log it - we'll let the user try manual signup/login
          console.error('Auto-accept failed:', data.error);
        }
      }
    } catch (error) {
      console.error('[Accept] Error in auto-accept process:', error);
    } finally {
      setAccepting(false);
    }
  };
  
  // Handle signup form submission
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      signupSchema.parse(signupFormData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof SignupFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignupFormData] = err.message;
          }
        });
        setFormErrors(prev => ({ ...prev, signup: newErrors }));
        toast.error('Please correct the errors in the form');
        return;
      }
    }
    
    setFormLoading(prev => ({ ...prev, signup: true }));
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', signupFormData.email);
      formDataToSend.append('password', signupFormData.password);
      formDataToSend.append('firstName', signupFormData.firstName);
      formDataToSend.append('lastName', signupFormData.lastName);
      formDataToSend.append('phone', signupFormData.phone.replace(/\D/g, ''));
      formDataToSend.append('invitationToken', token || '');
      
      // Call the signup action
      const response = await fetch('/api/auth/signup-with-invitation', {
        method: 'POST',
        body: formDataToSend,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.details) {
          // Handle validation errors from the server
          if (Array.isArray(result.details)) {
            const newErrors: Partial<Record<keyof SignupFormData, string>> = {};
            result.details.forEach((error: any) => {
              if (error.path?.[0]) {
                newErrors[error.path[0] as keyof SignupFormData] = error.message;
              }
            });
            setFormErrors(prev => ({ ...prev, signup: newErrors }));
          }
          toast.error(result.error);
        } else {
          toast.error(result.error || 'An error occurred during sign up');
        }
      } else {
        toast.success(result.message || 'Sign-up successful! Please check your email to confirm your account.');
        
        // Always redirect to check-email first
        console.log('[Signup] Redirecting to check-email page');
        window.location.href = '/check-email';
      }
    } catch (error: any) {
      console.error('Sign-up error:', error);
      toast.error(error.message || 'An error occurred during sign up');
    } finally {
      setFormLoading(prev => ({ ...prev, signup: false }));
    }
  };
  
  // Handle login form submission
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      loginSchema.parse(loginFormData);
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
    }
    
    setFormLoading(prev => ({ ...prev, login: true }));
    
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginFormData.email,
        password: loginFormData.password,
      });
      
      if (error) {
        toast.error(error.message || 'Failed to sign in');
        setFormErrors(prev => ({ 
          ...prev, 
          login: { 
            ...prev.login, 
            password: 'Invalid email or password' 
          } 
        }));
      } else {
        toast.success('Signed in successfully');
        
        // Now try to accept the invitation
        if (invitation) {
          await handleAcceptAfterLogin(invitation);
        } else {
          // If no invitation (shouldn't happen), just redirect to dashboard
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'An error occurred during sign in');
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
        
        // Redirect to the appropriate page based on role
        if (invitationData.role === 'LISTENER') {
          window.location.href = `/role-listener/dashboard`;
        } else {
          window.location.href = `/role-executor/dashboard`;
        }
      } else {
        console.error('[Accept] Error accepting invitation:', data);
        
        if (data.code === 'EMAIL_MISMATCH') {
          toast.error('The invitation was sent to a different email address');
          window.location.href = '/select-role';
        } else if (data.code === 'ALREADY_ACCEPTED') {
          toast.success('This invitation has already been accepted');
          
          // Redirect to the appropriate page based on role
          if (invitationData.role === 'LISTENER') {
            window.location.href = `/role-listener/dashboard`;
          } else {
            window.location.href = `/role-executor/dashboard`;
          }
        } else {
          toast.error(data.error || 'Failed to accept invitation');
          window.location.href = '/select-role';
        }
      }
    } catch (error) {
      console.error('[Accept] Error in accept process:', error);
      toast.error('An unexpected error occurred');
      window.location.href = '/select-role';
    } finally {
      setAccepting(false);
    }
  };
  
  // Format phone number for display
  const formatPhoneNumber = (input: string) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return input;
  };
  
  // Handle signup form input changes
  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    if (name === 'phone') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setSignupFormData(prev => ({ ...prev, [name]: formattedValue }));
  };
  
  // Handle login form input changes
  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader className="text-center">
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
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              Invitation Error
            </CardTitle>
            <CardDescription>We couldn't find your invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => router.push('/')}
              className="rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332]"
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If user is authenticated and accepting, show loading state
  if (isAuthenticated && accepting) {
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <UserPlus className="h-6 w-6 text-[#1B4332]" />
            Invitation to Join
          </CardTitle>
          <CardDescription>
            {invitation?.status === 'ACCEPTED' ? (
              'You have already accepted this invitation'
            ) : (
              `You've been invited to be a ${invitation?.role === 'LISTENER' ? 'Listener' : 'Executor'}`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="font-medium">
                {sharer ? (sharer.fullName || `${sharer.firstName} ${sharer.lastName}`) : 'Someone'} has invited you to join Telloom
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {invitation?.role === 'LISTENER' 
                  ? 'As a Listener, you will be able to view and listen to their stories.'
                  : 'As an Executor, you will help manage their account and legacy.'}
              </p>
            </div>
            
            {invitation?.status === 'ACCEPTED' ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                <p className="text-center font-medium">This invitation has already been accepted</p>
                <Button 
                  onClick={() => router.push('/')}
                  className="mt-4 rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332]"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signup" className="mt-4">
                  {invitation?.role === 'EXECUTOR' && (invitation?.executorFirstName || invitation?.executorLastName || invitation?.executorPhone) && (
                    <div className="mb-4 p-3 bg-[#f0f9eb] border border-[#8fbc55] rounded-lg text-sm">
                      <p className="font-medium text-[#1B4332]">
                        This form has been pre-filled with information provided by the sharer. You can edit these details if needed.
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={signupFormData.email}
                        onChange={handleSignupInputChange}
                        disabled={true} // Email is pre-filled from invitation
                        className="h-9 rounded-full"
                      />
                      {formErrors.signup.email && (
                        <p className="text-xs text-red-500">{formErrors.signup.email}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="firstName" className="text-sm font-medium">
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={signupFormData.firstName}
                          onChange={handleSignupInputChange}
                          required
                          className="h-9 rounded-full"
                        />
                        {formErrors.signup.firstName && (
                          <p className="text-xs text-red-500">{formErrors.signup.firstName}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="lastName" className="text-sm font-medium">
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={signupFormData.lastName}
                          onChange={handleSignupInputChange}
                          required
                          className="h-9 rounded-full"
                        />
                        {formErrors.signup.lastName && (
                          <p className="text-xs text-red-500">{formErrors.signup.lastName}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label htmlFor="phone" className="text-sm font-medium">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={signupFormData.phone}
                        onChange={handleSignupInputChange}
                        required
                        className="h-9 rounded-full"
                        placeholder="(123) 456-7890"
                      />
                      {formErrors.signup.phone && (
                        <p className="text-xs text-red-500">{formErrors.signup.phone}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <label htmlFor="password" className="text-sm font-medium">
                        Password
                      </label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={signupFormData.password}
                        onChange={handleSignupInputChange}
                        required
                        className="h-9 rounded-full"
                      />
                      {formErrors.signup.password && (
                        <p className="text-xs text-red-500">{formErrors.signup.password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm Password
                      </label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={signupFormData.confirmPassword}
                        onChange={handleSignupInputChange}
                        required
                        className="h-9 rounded-full"
                      />
                      {formErrors.signup.confirmPassword && (
                        <p className="text-xs text-red-500">{formErrors.signup.confirmPassword}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332]"
                      disabled={formLoading.signup}
                    >
                      {formLoading.signup ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <UserCircle className="mr-2 h-4 w-4" />
                          Create Account & Accept
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="login" className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="login-email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        value={loginFormData.email}
                        onChange={handleLoginInputChange}
                        required
                        className="h-9 rounded-full"
                      />
                      {formErrors.login.email && (
                        <p className="text-xs text-red-500">{formErrors.login.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className="text-sm font-medium">
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
                        className="h-9 rounded-full"
                      />
                      {formErrors.login.password && (
                        <p className="text-xs text-red-500">{formErrors.login.password}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332]"
                      disabled={formLoading.login}
                    >
                      {formLoading.login ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Sign In & Accept
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 