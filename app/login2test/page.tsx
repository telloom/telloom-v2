// app/(auth)/login/page.tsx
// This component renders the login page using the SignIn component

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SignIn from '@/components/SignIn';

export default async function LoginPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/select-role');
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignIn />
    </div>
  );
}