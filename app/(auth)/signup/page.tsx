// app/(auth)/signup/page.tsx
// This component renders the signup page using the SignUp component

import SignUp from '@/components/auth/SignUp';

export default function SignupPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignUp />
    </div>
  );
}
