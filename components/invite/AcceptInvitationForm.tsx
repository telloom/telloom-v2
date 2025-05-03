/**
 * File: components/invite/AcceptInvitationForm.tsx
 * Description: Form component for handling invitation acceptance and user registration
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Schema for new user sign up
const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Schema for accepting invitation (authenticated user)
const acceptSchema = z.object({});

// Union type for form data
type FormData = z.infer<typeof signUpSchema> | z.infer<typeof acceptSchema>;

interface Invitation {
  id: string;
  token: string;
  inviteeEmail: string;
  role: string;
  status: string;
  sharer: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface AcceptInvitationFormProps {
  invitation: Invitation;
  isAuthenticated: boolean;
  userEmail?: string;
}

export default function AcceptInvitationForm({
  invitation,
  isAuthenticated,
  userEmail,
}: AcceptInvitationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  // Use the appropriate schema based on authentication status
  const schema = isAuthenticated ? acceptSchema : signUpSchema;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isAuthenticated
      ? {}
      : {
          email: invitation.inviteeEmail,
          firstName: '',
          lastName: '',
          password: '',
        },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // If user is not authenticated, sign them up first
      if (!isAuthenticated) {
        const signUpData = data as z.infer<typeof signUpSchema>;
        
        // Check if the email matches the invitation
        if (signUpData.email !== invitation.inviteeEmail) {
          toast.error('The email address must match the invitation');
          setIsLoading(false);
          return;
        }
        
        // Sign up the user
        const { data: userData, error: signUpError } = await supabase.auth.signUp({
          email: signUpData.email,
          password: signUpData.password,
          options: {
            data: {
              firstName: signUpData.firstName,
              lastName: signUpData.lastName,
            },
          },
        });

        if (signUpError) {
          // Handle specific error cases
          if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
            toast.error('This email is already registered. Please sign in to accept the invitation.');
            setIsLoading(false);
            return;
          } else {
            console.error('Sign up error:', signUpError);
            toast.error(signUpError.message || 'Failed to sign up');
          }
          setIsLoading(false);
          return;
        }

        // Store the user data
        setCurrentUser(userData.user);
        
        // Check if email verification is required
        if (userData.user?.identities?.length === 0) {
          toast.info('Please check your email to verify your account before continuing');
          setIsLoading(false);
          return;
        }
        
        toast.success('Account created successfully!');
      }

      // Get the current user if not already available
      let userToUse = currentUser;
      if (!userToUse && isAuthenticated) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userToUse = user;
          setCurrentUser(user);
        } catch (error: any) {
          // Handle AuthSessionMissingError
          if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
            console.warn('Auth session missing when accepting invitation');
            toast.error('Your session has expired. Please sign in again.');
            router.push(`/login?redirect=/invitation/accept?token=${invitation.token}`);
            setIsLoading(false);
            return;
          }
          throw error;
        }
      }

      // Accept the invitation
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          token: invitation.token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (result.error === 'Email not verified') {
          toast.error('Please verify your email before accepting the invitation');
        } else if (result.error === 'User not authenticated') {
          toast.error('You need to be signed in to accept this invitation');
          // Redirect to sign in page
          router.push(`/login?redirect=/invitation/accept?token=${invitation.token}`);
        } else {
          console.error('Accept invitation error:', result.error);
          toast.error(result.error || 'Failed to accept invitation');
        }
        setIsLoading(false);
        return;
      }

      // Success! Show a toast and redirect
      toast.success('Invitation accepted successfully!');
      
      // Redirect based on the role
      if (invitation.role === 'EXECUTOR') {
        router.push('/executor/dashboard');
      } else {
        router.push('/listener/dashboard');
      }
    } catch (error: any) {
      console.error('Error in invitation acceptance process:', error);
      
      // Handle network errors or other unexpected issues
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(error.message || 'An unexpected error occurred');
      }
      
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isAuthenticated && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Email" 
                      {...field} 
                      disabled 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a password" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-[#1B4332] hover:bg-[#8fbc55] rounded-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAuthenticated ? 'Accepting Invitation...' : 'Creating Account...'}
              </>
            ) : (
              isAuthenticated ? 'Accept Invitation' : 'Create Account & Accept'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 