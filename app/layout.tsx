'use client';

// app/layout.tsx

import './styles/globals.css';
import { ReactNode } from 'react';
import SupabaseListener from '@/components/SupabaseListener';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { SpeedInsights } from "@vercel/speed-insights/next";

// Set export config
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const inter = Inter({ subsets: ['latin'] });

export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <SupabaseListener />
          <Toaster position="top-center" richColors />
          {children}
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}