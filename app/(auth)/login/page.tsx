// app/(auth)/login/page.tsx
// This page handles user login and authentication flow
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Login from '@/components/Login';

export default async function LoginPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <Login />
    </div>
  );
}