// app/role-sharer/layout.tsx
// This layout component ensures that the user is authenticated and has the SHARER role before rendering the children components.

import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/server';

export default async function SharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  
  // Use getUser instead of getSession for better security
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.log('No authenticated user found, redirecting to login');
    redirect('/login');
  }

  try {
    // Check if user has SHARER role
    const { data: roleData, error: roleError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id)
      .eq('role', 'SHARER')
      .single();

    if (roleError) {
      console.error('Error checking SHARER role:', roleError);
      redirect('/select-role');
    }

    if (!roleData) {
      console.log('User does not have SHARER role');
      redirect('/select-role');
    }

    console.log('SHARER role verified for user');

    return (
      <>
        <Header />
        {children}
      </>
    );
  } catch (error) {
    console.error('Unexpected error in SharerLayout:', error);
    redirect('/login');
  }
}
