// app/layout.tsx

import './styles/globals.css';
import { ReactNode } from 'react';
import SupabaseListener from '@/components/SupabaseListener';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SupabaseListener />
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}