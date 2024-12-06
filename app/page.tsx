// app/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RoleSelection from '@/components/RoleSelection';
import Header from '@/components/Header';

export default async function HomePage() {
  const supabase = createClient();
  
  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  try {
    // Check user roles
    const { data: roleData, error: roleError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (roleError) {
      console.error('Role check failed:', roleError);
      return (
        <>
          <Header />
          <RoleSelection />
        </>
      );
    }

    // If user has no roles, show role selection
    if (!roleData || roleData.length === 0) {
      return (
        <>
          <Header />
          <RoleSelection />
        </>
      );
    }

    // If user has SHARER role, redirect to sharer dashboard
    if (roleData.some(r => r.role === 'SHARER')) {
      redirect('/role-sharer');
    }

    // If user has LISTENER role, redirect to listener dashboard
    if (roleData.some(r => r.role === 'LISTENER')) {
      redirect('/role-listener');
    }

    // Default to role selection if no specific role is found
    return (
      <>
        <Header />
        <RoleSelection />
      </>
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return (
      <>
        <Header />
        <RoleSelection />
      </>
    );
  }
}
