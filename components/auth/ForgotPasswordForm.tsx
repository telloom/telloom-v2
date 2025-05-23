/**
 * File: components/auth/ForgotPasswordForm.tsx
 * Description: Forgot password form component that handles password reset requests using Loops.so for emails.
 */

'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2 } from "lucide-react";
import Logo from '@/components/Logo';
import { ClientFormWrapper } from '@/components/client-wrapper';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset password email');
      }

      setIsSubmitted(true);
      toast.success('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'An error occurred while sending the reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full min-w-[300px] sm:min-w-[350px] md:min-w-[400px] max-w-3xl">
        <div className="text-center mb-6">
          <div className="mb-6">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Reset your password</h1>
          <p className="text-muted-foreground text-sm">
            {isSubmitted 
              ? "Check your email for a reset link" 
              : "Enter your email and we'll send you a link to reset your password"}
          </p>
        </div>

        <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-6 rounded-lg w-full">
          <ClientFormWrapper>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                <div className="space-y-1.5 w-full">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium leading-none"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    {...register('email')}
                    className="h-8 px-2 text-[16px] rounded-full w-full md:h-9 md:px-3 md:text-sm border-input"
                    disabled={isSubmitting}
                    aria-label="Email address"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    className="w-full h-8 px-3 text-[16px] rounded-full bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-colors md:h-9 md:px-4 md:text-sm"
                    disabled={isSubmitting}
                    aria-label={isSubmitting ? 'Sending...' : 'Send Reset Link'}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="mb-4">
                  We've sent a password reset link to your email.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you don't see it, please check your spam folder.
                </p>
              </div>
            )}

            <div className="text-center text-sm mt-4">
              <p className="text-muted-foreground text-xs">
                Remember your password?{' '}
                <Link href="/login" className="text-[#1B4332] hover:text-[#8fbc55] transition-colors font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </ClientFormWrapper>
        </div>
      </div>
    </div>
  );
} 