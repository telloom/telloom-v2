import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';

async function getUserWithRoleData() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, roleData: null };
    }

    // Get role data from JWT claims
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_data');

    if (roleError) {
      console.error('Error getting role data:', roleError);
      return { user, roleData: null };
    }

    return { user, roleData };
  } catch (error) {
    console.error('Error in getUserWithRoleData:', error);
    return { user: null, roleData: null };
  }
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, roleData } = await getUserWithRoleData();

  if (!user) {
    redirect('/login');
  }

  if (!roleData) {
    console.error('[AuthenticatedLayout] Unable to get role data, redirecting to /select-role');
    redirect('/select-role');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {children}
    </div>
  );
}