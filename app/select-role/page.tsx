// app/select-role/page.tsx
import { supabaseServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RoleSelection from '@/components/RoleSelection';

export default async function SelectRolePage() {
  const supabase = supabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return <RoleSelection />;
}