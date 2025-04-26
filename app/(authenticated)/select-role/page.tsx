// app/select-role/page.tsx
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import SelectRoleClient from '@/components/SelectRoleClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default async function SelectRolePage() {
  try {
    // Create server-side Supabase client and admin client
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Get user with proper error handling
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error in select-role page:', authError.message);
      redirect('/login');
    }
    
    if (!user) {
      redirect('/login');
    }

    // Use RPC function to check if user has any roles
    const { data: roleInfo, error: roleError } = await adminClient.rpc(
      'get_user_role_emergency',
      { user_id: user.id }
    );

    if (roleError) {
      console.error('Error getting role info:', roleError);
      
      // Show error UI instead of redirecting
      return (
        <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
          <div className="w-full max-w-6xl px-4 py-6 md:py-8">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                There was a problem determining your role. Please try again later or contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    console.log('User role info in server component:', roleInfo);

    // Check if user has roles
    const userRoles = roleInfo?.roles || [];
    const hasRoles = Array.isArray(userRoles) && userRoles.length > 0;

    // If user has no roles, redirect to onboarding
    if (!hasRoles) {
      console.log('User has no roles, redirecting to onboarding:', { userId: user.id });
      redirect('/onboarding');
    }
    
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="w-full max-w-6xl px-4 py-6 md:py-8">
          <SelectRoleClient userId={user.id} />
        </div>
      </div>
    );
  } catch (error: any) { // Type error as any to access digest
    // Check if the error is a Next.js redirect error
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      console.log('[SelectRolePage] Caught NEXT_REDIRECT, re-throwing...');
      throw error; // Re-throw the redirect error so Next.js can handle it
    }
    
    // Handle other unexpected errors
    console.error('[SelectRolePage] Unexpected non-redirect error:', error);
    // Redirect to a generic error page for other errors
    redirect('/error'); 
  }
}
