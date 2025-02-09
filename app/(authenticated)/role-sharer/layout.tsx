// app/role-sharer/layout.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';

async function RoleSharerLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has SHARER role
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  const hasSharerRole = roles?.some(r => r.role === 'SHARER');
  
  if (!hasSharerRole) {
    redirect('/select-role');
  }

  // Check if they have a ProfileSharer record
  const { data: profileSharer } = await supabase
    .from('ProfileSharer')
    .select('id')
    .eq('profileId', user.id)
    .single();

  if (!profileSharer) {
    // If they don't have a ProfileSharer record, create one
    const { error: createError } = await supabase
      .from('ProfileSharer')
      .insert([{ profileId: user.id }]);

    if (createError) {
      console.error('Error creating ProfileSharer:', createError);
      redirect('/select-role');
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
