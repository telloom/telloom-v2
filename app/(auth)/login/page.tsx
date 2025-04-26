/**
 * File: app/(auth)/login/page.tsx
 * Description: Login page that provides user authentication functionality using Supabase Auth.
 * Uses the LoginForm component for handling the authentication flow.
 */

// app/(auth)/login/page.tsx
// app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoginForm />
    </div>
  );
}