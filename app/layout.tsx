// app/layout.tsx

import './globals.css';
import { ReactNode, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, session }),
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}