/**
 * File: components/ForgotPassword.tsx
 * Description: A password recovery form component that allows users to request a password reset link.
 * Features email input validation, loading states, success/error notifications, and integration
 * with Supabase Auth for secure password reset functionality.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send reset password email');
      }

      setMessage({ type: 'success', text: 'Password reset email sent. Please check your inbox.' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader className="flex flex-col items-center">
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={200}
          height={50}
          className="mb-4"
        />
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>Enter your email to reset your password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleForgotPassword}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <CardFooter className="flex flex-col items-center gap-4">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Sending...' : 'Reset Password'}
            </Button>
            <div className="flex w-full justify-between text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
              <Link href="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </div>
            {message && (
              <Alert
                className="mt-4"
                variant={message.type === 'error' ? 'destructive' : 'default'}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
