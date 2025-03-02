// app/(auth)/error/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams?.get('error') || 'unknown';
  const errorMessage = searchParams?.get('message') || 'An unexpected error occurred.';

  // Define error messages based on error type
  const getErrorDetails = () => {
    switch (errorType) {
      case 'verification_failed':
        return {
          title: 'Email Verification Failed',
          message: 'The email verification link is invalid or has expired.',
          description: 'Please try signing up again to receive a new verification link.',
          action: {
            label: 'Sign Up Again',
            href: '/signup'
          }
        };
      case 'missing_params':
        return {
          title: 'Invalid Link',
          message: 'The link you followed is missing required parameters.',
          description: 'Please check your email and click the complete link, or try signing up again.',
          action: {
            label: 'Return to Sign Up',
            href: '/signup'
          }
        };
      case 'user_not_found':
        return {
          title: 'User Not Found',
          message: 'We couldn\'t find your account after verification.',
          description: 'Please try signing in with your email and password.',
          action: {
            label: 'Sign In',
            href: '/login'
          }
        };
      default:
        return {
          title: 'An Error Occurred',
          message: errorMessage,
          description: 'Please try again or contact support if the issue persists.',
          action: {
            label: 'Return to Home',
            href: '/'
          }
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="w-full max-w-md border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
        <div className="text-center mb-6">
          <Image
            src="/images/Telloom Logo V1-Horizontal Green.png"
            alt="Telloom Logo"
            width={160}
            height={40}
            className="mx-auto mb-3"
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: '160px'
            }}
          />
        </div>
        
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-xl font-bold">{errorDetails.title}</h1>
          <p className="text-muted-foreground">{errorDetails.message}</p>
          <p className="text-sm">{errorDetails.description}</p>
          
          <div className="pt-4">
            <Button 
              asChild
              className="w-full bg-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332] rounded-full"
            >
              <Link href={errorDetails.action.href}>
                {errorDetails.action.label}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="space-y-4 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}