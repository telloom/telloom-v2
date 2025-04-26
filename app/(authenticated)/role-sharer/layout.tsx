// app/role-sharer/layout.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';
import ClearRoleTransition from '@/components/ClearRoleTransition';
import { getCookie } from '@/utils/next-cookies-helper';
import { getUserWithRoleData } from '@/utils/supabase/jwt-helpers';
import { createAdminClient } from '@/utils/supabase/admin';

async function RoleSharerLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[role-sharer/layout] Starting layout processing');
  
  // Get user and role data from JWT claims
  const { user, roleData } = await getUserWithRoleData();

  if (!user) {
    console.log('[role-sharer/layout] No user found, redirecting to login');
    redirect('/login');
  }

  console.log('[role-sharer/layout] Authenticated user:', user.id);

  // Get the activeRole cookie first to track explicit user choice
  const activeRole = await getCookie('activeRole');
  console.log('[role-sharer/layout] Active role from cookie:', activeRole);

  // Check if user has SHARER role using JWT claims
  if (!roleData.roles.includes('SHARER')) {
    console.log('[role-sharer/layout] User does not have SHARER role, redirecting to select-role');
    redirect('/select-role');
  }

  try {
    // Check if the user has a ProfileSharer record
    if (!roleData.isSharer) {
      console.log('[role-sharer/layout] User has SHARER role but no ProfileSharer record');
      
      // Only redirect to executor if they didn't explicitly select SHARER role
      if (activeRole !== 'SHARER' && roleData.roles.includes('EXECUTOR')) {
        console.log('[role-sharer/layout] Redirecting to role-executor as user has EXECUTOR role');
        redirect('/role-executor');
      } else {
        console.log('[role-sharer/layout] User explicitly selected SHARER role, but no ProfileSharer record');
        
        // If we need to create a ProfileSharer record, we would do so here
        // For now, just redirect to select-role
        redirect('/select-role');
      }
    }

    // Get the effective sharer ID
    const effectiveSharerId = roleData.sharerId;
    if (!effectiveSharerId) {
      console.error('[role-sharer/layout] No sharer ID in JWT claims for user with isSharer=true:', { userId: user.id });
      
      // Fall back to getting the sharer ID from the database
      const adminClient = createAdminClient();
      const { data: roleInfo, error: roleError } = await adminClient.rpc(
        'get_user_role_emergency',
        { user_id: user.id }
      );

      if (roleError || !roleInfo?.sharerId) {
        console.error('[role-sharer/layout] Failed to retrieve sharer ID for user with ProfileSharer record:', { userId: user.id });
        redirect('/select-role');
      }
    }

    console.log('[role-sharer/layout] Layout checks passed, continuing to render page');
  } catch (error) {
    console.error('[role-sharer/layout] Unexpected error:', error);
    redirect('/error?reason=role-check-error');
  }

  return (
    <div className="min-h-screen bg-background">
      <ClearRoleTransition />
      {children}
    </div>
  );
}

export default function RoleSharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<RoleLayoutLoading />}>
      <RoleSharerLayoutContent>{children}</RoleSharerLayoutContent>
    </Suspense>
  );
}
