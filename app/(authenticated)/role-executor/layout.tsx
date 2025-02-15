import { checkRole } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';

async function RoleExecutorLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user has EXECUTOR role
  const hasExecutorRole = await checkRole('EXECUTOR');
  if (!hasExecutorRole) {
    redirect('/select-role');
  }

  return (
    <div className="min-h-[calc(100vh-65px)]">
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

