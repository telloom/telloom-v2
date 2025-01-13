// app/select-role/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RoleSelection from '@/components/RoleSelection';
import Header from '@/components/Header';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

export default async function SelectRolePage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <>
      <Header />
      <AuthenticatedLayout>
        <RoleSelection />
      </AuthenticatedLayout>
    </>
  );
}
