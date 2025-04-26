import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';
import ClearRoleTransition from '@/components/ClearRoleTransition';
import { checkRole, hasExecutorRelationship } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCookie } from '@/utils/next-cookies-helper';

async function RoleExecutorLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[role-executor/layout] Starting layout processing');
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    console.log('[role-executor/layout] No user found, redirecting to login');
    redirect('/login');
  }

  console.log('[role-executor/layout] Authenticated user:', user.id);

  // Get the activeRole cookie
  const activeRole = await getCookie('activeRole');
  console.log('[role-executor/layout] Active role from cookie:', activeRole);

  // Check if user has EXECUTOR role using the RPC function
  const hasExecutorRole = await checkRole('EXECUTOR');
  console.log('[role-executor/layout] User has EXECUTOR role:', hasExecutorRole);
  
  if (!hasExecutorRole) {
    console.log('[role-executor/layout] User does not have EXECUTOR role, redirecting to select-role');
    redirect('/select-role');
  }

  try {
    // Use the RPC function to get executor information
    const { data: executorInfo, error: executorError } = await adminClient.rpc(
      'get_executor_for_user',
      { user_id: user.id }
    );

    if (executorError) {
      console.error('[role-executor/layout] Error getting executor info:', executorError);
      redirect('/error?reason=executor-check-failed');
    }

    console.log('[role-executor/layout] Executor info:', executorInfo);

    // Check if the user has an executor relationship
    if (!executorInfo?.has_executor_relationship) {
      // User has the EXECUTOR role but no executor relationship
      console.error('[role-executor/layout] User has EXECUTOR role but no executor relationship:', { userId: user.id });
      redirect('/select-role');
    }

    // If user is also a sharer, they might need to be redirected to the sharer role
    if (executorInfo.is_sharer) {
      if (activeRole !== 'EXECUTOR') {
        // If they explicitly selected EXECUTOR role, keep them here
        // Otherwise, redirect them to the sharer role
        console.log('[role-executor/layout] User is also a sharer, redirecting to role-sharer');
        redirect('/role-sharer');
      }
    }
    
    console.log('[role-executor/layout] Layout checks passed, continuing to render page');
  } catch (error) {
    console.error('[role-executor/layout] Unexpected error:', error);
    redirect('/error?reason=executor-check-error');
  }

  return (
    <div className="min-h-[calc(100vh-65px)]">
      <ClearRoleTransition />
      {children}
    </div>
  );
}

export default function RoleExecutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<RoleLayoutLoading />}>
      <RoleExecutorLayoutContent>{children}</RoleExecutorLayoutContent>
    </Suspense>
  );
}

