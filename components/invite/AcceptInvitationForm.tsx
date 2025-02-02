/**
 * File: components/invite/AcceptInvitationForm.tsx
 * Description: Form component for handling invitation acceptance and user registration if needed
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
import { Loader2 } from 'lucide-react';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const acceptSchema = z.object({
  accept: z.boolean().default(true),
});

interface AcceptInvitationFormProps {
  invitation: any; // Replace with proper type
  isAuthenticated: boolean;
  userEmail?: string;
}

export default function AcceptInvitationForm({
  invitation,
  isAuthenticated,
  userEmail,
}: AcceptInvitationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Use different form schemas based on authentication status
  const form = useForm({
    resolver: zodResolver(isAuthenticated ? acceptSchema : signUpSchema),
    defaultValues: {
      email: invitation.inviteeEmail,
      firstName: '',
      lastName: '',
      password: '',
      accept: true,
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        // Sign up the user first
        const { error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              firstName: data.firstName,
              lastName: data.lastName,
            },
          },
        });

        if (signUpError) throw signUpError;
      }

      // Accept the invitation
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: invitation.token,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept invitation');
      }

      toast.success('Invitation accepted successfully');
      
      // Redirect based on the role
      if (invitation.role === 'LISTENER') {
        router.push('/role-listener/dashboard');
      } else if (invitation.role === 'EXECUTOR') {
        router.push('/role-executor/dashboard');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isAuthenticated && (
          <>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
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
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button
          type="submit"
          className="w-full"
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
      </form>
    </Form>
  );
} 