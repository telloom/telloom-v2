/**
 * File: components/auth/LoginForm.tsx
 * Description: Login form component that handles user authentication using Supabase Auth.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { ClientFormWrapper } from '@/components/client-wrapper';
import Logo from '@/components/Logo';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

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
      router.push('/select-role');
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
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 pb-4 px-1 sm:justify-center sm:py-4 sm:px-4">
      <div className="w-full min-w-[300px] sm:min-w-[350px] md:min-w-[400px] max-w-3xl">
        <div className="text-center mb-6">
          <div className="mb-6">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to your account to continue
          </p>
        </div>

        <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-6 rounded-lg w-full">
          <ClientFormWrapper>
            <form onSubmit={handleSubmit} className="space-y-3 w-full">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10 border-input rounded-full w-full text-[16px]"
                  disabled={isLoading}
                  aria-label="Email address"
                />
              </div>

              <div className="space-y-1.5 w-full">
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
                  className="h-10 border-input rounded-full w-full text-[16px]"
                  disabled={isLoading}
                  aria-label="Password"
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  className="w-full h-9 bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-colors rounded-full text-[16px] md:text-sm"
                  disabled={isLoading}
                  aria-label={isLoading ? 'Signing in...' : 'Sign In'}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center text-sm mt-3 space-y-1">
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
    </div>
  );
} 