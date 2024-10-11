// app/(auth)/check-email/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CheckEmailPage() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/auth/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
      <p className="text-center mb-6">
        A confirmation email has been sent to your email address. Please click
        the link in the email to proceed.
      </p>
      <Button onClick={handleClick}>Back to Login</Button>
    </div>
  );
}