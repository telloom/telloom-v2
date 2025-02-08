// app/select-role/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SelectRoleClient from '@/components/SelectRoleClient';

export default async function SelectRolePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Always show the role selection UI
  return <SelectRoleClient />;
}
