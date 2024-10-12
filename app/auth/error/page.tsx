// app/auth/error/page.tsx

'use client';

import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error');

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="space-y-4 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">An Error Occurred</h1>
        <p>{errorMessage ? errorMessage : 'An unexpected error occurred.'}</p>
        <p>Please try again or contact support if the issue persists.</p>
        <a href="/signup" className="text-primary hover:underline">
          Return to Sign Up
        </a>
      </div>
    </div>
  );
}