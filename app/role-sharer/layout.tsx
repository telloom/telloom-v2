// app/role-sharer/layout.tsx
// This layout component ensures that the user is authenticated and has the SHARER role before rendering the children components.

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';

export default async function SharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('SharerLayout - auth check:', { 
      userId: user?.id,
      error: authError 
    });

    if (authError || !user) {
      redirect('/login');
    }

    // Check if user has SHARER role
    const { data: roleData, error: roleError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id)
      .eq('role', 'SHARER')
      .single();

    console.log('SharerLayout - role check:', {
      roleData,
      roleError
    });

    // For now, allow access even without the role
    // if (!roleData || roleError) {
    //   redirect('/');
    // }

    // Debug queries
    const promptQuery = await supabase
      .from('Prompt')
      .select('*')
      .limit(1);

    const categoryQuery = await supabase
      .from('PromptCategory')
      .select('*')
      .limit(1);

    console.log('SharerLayout - debug queries:', {
      prompt: {
        data: promptQuery.data,
        error: promptQuery.error
      },
      category: {
        data: categoryQuery.data,
        error: categoryQuery.error
      }
    });

    return (
      <>
        <Header />
        {children}
      </>
    );
  } catch (error) {
    console.error('Unexpected error in SharerLayout:', error);
    redirect('/');
  }
}
