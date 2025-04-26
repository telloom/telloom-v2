import { getUserWithRoleData } from '@/utils/supabase/jwt-helpers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';
import ClearRoleTransition from '@/components/ClearRoleTransition';
import { getCookie } from '@/utils/next-cookies-helper';

async function RoleListenerLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Get user and role data from JWT claims
    const { user, roleData } = await getUserWithRoleData();
    
    if (!user) {
      console.error('[role-listener/layout] No authenticated user found');
      redirect('/login');
    }

    // Check if user has LISTENER role from JWT claims
    if (!roleData.roles.includes('LISTENER')) {
      console.log('[role-listener/layout] User does not have LISTENER role:', { userId: user.id });
      redirect('/select-role');
    }

    // Check for cookie to determine intended role
    const activeRole = await getCookie('activeRole');
    console.log('[role-listener/layout] Active role from cookie:', activeRole);

    // If user is a sharer and didn't explicitly select LISTENER role, redirect them to SHARER role
    if (roleData.isSharer && activeRole !== 'LISTENER') {
      redirect('/role-sharer');
    }

    // If user is an executor but not a sharer, and didn't explicitly select LISTENER role, redirect them to EXECUTOR role
    if (roleData.hasExecutor && !roleData.isSharer && activeRole !== 'LISTENER') {
      redirect('/role-executor');
    }
  } catch (error) {
    console.error('[role-listener/layout] Unexpected error:', error);
    redirect('/error?reason=role-check-error');
  }

  return (
    <div className="min-h-[calc(100vh-65px)]">
      <ClearRoleTransition />
      {children}
    </div>
  );
}

export default function RoleListenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<RoleLayoutLoading />}>
      <RoleListenerLayoutContent>{children}</RoleListenerLayoutContent>
    </Suspense>
  );
}
