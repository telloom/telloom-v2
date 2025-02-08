/**
 * File: app/(auth)/login/page.tsx
 * Description: Login page that provides user authentication functionality using Supabase Auth.
 * Uses the LoginForm component for handling the authentication flow.
 */

// app/(auth)/login/page.tsx
// app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { redirect } from 'next/navigation';
import { getUser } from '@/utils/supabase/server';

export default async function LoginPage() {
  // Check if user is already authenticated
  const user = await getUser();
  if (user) {
    redirect('/role-sharer/topics');
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoginForm />
    </div>
  );
}