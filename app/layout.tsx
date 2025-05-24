// app/layout.tsx

import './styles/globals.css';
import { ReactNode } from 'react';
import SupabaseListener from '@/components/SupabaseListener';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { createClient } from '@/utils/supabase/server';

// Set export config
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const inter = Inter({ subsets: ['latin'] });

export const runtime = 'nodejs';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <SupabaseListener serverSession={!!session} />
          <Toaster position="top-center" richColors />
          {children}
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}