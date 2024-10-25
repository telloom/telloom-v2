// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../app/styles/globals.css';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/server';
import UserProvider from '@/components/UserProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Telloom',
  description: 'Bridging Generations through Video Storytelling',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  // Fetch the authenticated user on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Initialize user state on the client */}
        <UserProvider initialUser={user}>
          <Header />
          <main>{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}