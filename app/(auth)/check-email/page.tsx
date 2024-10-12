// app/(auth)/check-email/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function CheckEmailPage() {
  const router = useRouter();

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
        <CardTitle>Check Your Email</CardTitle>
        <CardDescription>We&apos;ve sent you a confirmation email</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center mb-6">
          A confirmation email has been sent to your email address. Please click
          the link in the email to proceed.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4">
        <Button 
          className="w-full" 
          onClick={() => router.push('/login')}
        >
          Back to Login
        </Button>
        <div className="flex w-full justify-center text-sm">
          <Link href="/signup" className="text-primary hover:underline">
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
