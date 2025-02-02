/**
 * File: components/auth/LoginForm.tsx
 * Description: Login form component that handles user authentication using Supabase Auth.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { ClientFormWrapper } from '@/components/client-wrapper';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/role-sharer/topics';

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Successfully signed in!');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={160}
          height={40}
          className="mx-auto mb-3"
        />
        <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sign in to your account to continue
        </p>
      </div>

      <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-5 rounded-lg">
        <ClientFormWrapper>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 border-input rounded-full"
                disabled={isLoading}
                aria-label="Email address"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-9 border-input rounded-full"
                disabled={isLoading}
                aria-label="Password"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-9 bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-colors rounded-full"
                disabled={isLoading}
                aria-label={isLoading ? 'Signing in...' : 'Sign In'}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm mt-3 space-y-2">
                <p className="text-muted-foreground text-xs">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-[#1B4332] hover:text-[#8fbc55] transition-colors font-medium">
                    Sign up
                  </Link>
                </p>
                <p className="text-muted-foreground text-xs">
                  <Link href="/forgot-password" className="text-[#1B4332] hover:text-[#8fbc55] transition-colors font-medium">
                    Forgot your password?
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </ClientFormWrapper>
      </div>
    </div>
  );
} 