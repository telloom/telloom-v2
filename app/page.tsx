'use client';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function IndexPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for error parameters in the URL
    const error = searchParams.get('error');
    if (error) {
      switch (error) {
        case 'missing-token':
          setErrorMessage('The invitation link is invalid. It is missing a required token.');
          break;
        case 'invalid-token':
          setErrorMessage('The invitation link contains an invalid token. The invitation may have been deleted or never existed.');
          break;
        case 'invalid-invitation':
          setErrorMessage('We couldn\'t find a valid invitation with this token.');
          break;
        case 'expired-invitation':
          setErrorMessage('This invitation has expired or is no longer valid.');
          break;
        case 'already-accepted':
          setErrorMessage('This invitation has already been accepted.');
          break;
        case 'already-declined':
          setErrorMessage('This invitation has already been declined.');
          break;
        default:
          setErrorMessage('An error occurred. Please try again or contact support.');
      }
      return; // Don't redirect if we're showing an error
    }

    const checkUser = async () => {
      console.log('[ROOT PAGE] Starting authentication check');
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('[ROOT PAGE] Auth check result:', { 
          hasUser: !!user, 
          hasError: !!error,
          errorMessage: error?.message
        });
        
        if (error || !user) {
          console.log('[ROOT PAGE] No authenticated user, redirecting to /login');
          router.push('/login');
          return;
        }

        console.log('[ROOT PAGE] User authenticated, checking roles');
        const { data: roles, error: rolesError } = await supabase
          .from('ProfileRole')
          .select('role')
          .eq('profileId', user.id);

        console.log('[ROOT PAGE] Roles check result:', { 
          roles: roles?.map(r => r.role), 
          hasError: !!rolesError,
          errorMessage: rolesError?.message
        });

        if (!roles || roles.length === 0) {
          console.log('[ROOT PAGE] No roles found, redirecting to /select-role');
          router.push('/select-role');
          return;
        }

        // Redirect based on the user's role
        const role = roles[0].role;
        console.log('[ROOT PAGE] Redirecting based on role:', role);
        
        switch (role) {
          case 'ADMIN':
            router.push('/role-admin/topics');
            break;
          case 'SHARER':
            router.push('/role-sharer/topics');
            break;
          case 'EXECUTOR':
            router.push('/role-executor/topics');
            break;
          case 'LISTENER':
            router.push('/role-listener/topics');
            break;
          default:
            console.log('[ROOT PAGE] Unknown role, redirecting to /select-role');
            router.push('/select-role');
        }
      } catch (error) {
        console.error('[ROOT PAGE] Unexpected error during auth check:', error);
        router.push('/login');
      }
    };

    checkUser();
  }, [router, supabase, searchParams]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border-2 border-red-500 bg-white p-6 shadow-[6px_6px_0_0_#f87171]">
          <div className="mb-4 flex items-center">
            <AlertCircle className="mr-2 h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-red-500">Invitation Error</h2>
          </div>
          <p className="mb-6 text-gray-700">{errorMessage}</p>
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => router.push('/login')}
              className="bg-[#1B4332] text-white hover:bg-[#8fbc55]"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => router.push('/signup')}
              variant="outline"
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]/10"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-lg">
        Please wait while we check your profile...
      </div>
    </div>
  );
}
