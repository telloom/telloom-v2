// app/(auth)/error/page.tsx
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams?.get('error');

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="space-y-4 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">An Error Occurred</h1>
        <p>{errorMessage ? errorMessage : 'An unexpected error occurred.'}</p>
        <p>Please try again or contact support if the issue persists.</p>
        <Link href="/signup" className="text-primary hover:underline">
          Return to Sign Up
        </Link>
      </div>
    </div>
  );
}