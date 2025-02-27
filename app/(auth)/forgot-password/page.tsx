/**
 * File: app/(auth)/forgot-password/page.tsx
 * Description: Forgot password page that allows users to request a password reset link.
 */

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Telloom',
  description: 'Reset your password to access your Telloom account',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
