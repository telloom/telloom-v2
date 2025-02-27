/**
 * File: app/(auth)/reset-password/page.tsx
 * Description: Reset password page that allows users to set a new password after receiving a reset link.
 */

import { Metadata } from 'next';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Reset Password | Telloom',
  description: 'Reset your password to access your Telloom account.',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // In Next.js 15, searchParams is a Promise that needs to be awaited
  const resolvedParams = await Promise.resolve(searchParams);
  
  // Log page rendering for debugging
  console.log(
    '[PAGE DEBUG] Reset password page rendering with params:',
    Object.keys(resolvedParams).length > 0 ? 'Has params' : 'No params',
    resolvedParams.token_hash ? `Has token_hash: ${String(resolvedParams.token_hash).substring(0, 20)}...` : 'No token_hash',
    resolvedParams.type ? `Type: ${resolvedParams.type}` : 'No type',
    `Timestamp: ${Date.now()}`
  );

  // Log if we're server-side rendering
  if (typeof window === 'undefined') {
    console.log('[PAGE DEBUG] Server-side rendering, no window object');
  }

  // Check if we have a token in the URL
  const hasToken = !!resolvedParams.token_hash || !!resolvedParams.access_token;
  console.log('[PAGE DEBUG] Has token in URL:', hasToken);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full min-w-[300px] sm:min-w-[350px] md:min-w-[400px] max-w-3xl">
        <div className="text-center mb-6">
          <div className="mb-6">
            <Logo />
          </div>
        </div>
        <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-6 rounded-lg w-full">
          {/* Always set preventRedirect to true to avoid automatic redirects */}
          <ResetPasswordForm preventRedirect={true} />
        </div>
      </div>
    </div>
  );
} 