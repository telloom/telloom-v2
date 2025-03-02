// app/(auth)/check-email/page.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckEmail() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
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
          <h1 className="text-xl font-bold tracking-tight">Check your email</h1>
        </div>

        <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-5 rounded-lg">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              We sent you a confirmation link. Click the link in your email to activate your account.
            </p>
            <Button
              asChild
              className="w-full h-9 bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-colors rounded-full"
            >
              <Link href="/login">
                Back to login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
