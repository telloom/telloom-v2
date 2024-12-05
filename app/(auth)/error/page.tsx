// app/(auth)/error/page.tsx
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="space-y-4 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>{error || 'An unexpected error occurred.'}</p>
        <p>Please try again or contact support if the issue persists.</p>
        <a href="/" className="text-primary hover:underline">
          Return to Home
        </a>
      </div>
    </div>
  );
}