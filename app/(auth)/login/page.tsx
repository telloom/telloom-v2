// app/(auth)/login/page.tsx

import { getUser } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Login from '@/components/Login';

export default async function LoginPage() {
  const { user, error } = await getUser();

  if (user && !error) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <Login />
    </div>
  );
}