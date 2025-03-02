import { checkRole } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';
import ClearRoleTransition from '@/components/ClearRoleTransition';

async function RoleListenerLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user has LISTENER role
  const hasListenerRole = await checkRole('LISTENER');
  if (!hasListenerRole) {
    redirect('/select-role');
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



