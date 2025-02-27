/**
 * File: components/auth/SignOut.tsx
 * Description: Sign out component that handles user logout.
 */

"use client";

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignOut() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
} 