// app/(auth)/login/page.tsx
// This component renders the login page using the SignIn component

import SignIn from '@/components/SignIn';

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignIn />
    </div>
  );
}