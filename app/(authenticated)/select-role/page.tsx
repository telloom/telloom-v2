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

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
      <div className="w-full max-w-6xl px-4 py-6 md:py-8">
        <SelectRoleClient />
      </div>
    </div>
  );
}
