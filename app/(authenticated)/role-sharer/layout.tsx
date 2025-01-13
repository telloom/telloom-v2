// app/role-sharer/layout.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function RoleSharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has SHARER role
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (!roles?.some(r => r.role === 'SHARER')) {
    redirect('/select-role');
  }

  return children;
}
