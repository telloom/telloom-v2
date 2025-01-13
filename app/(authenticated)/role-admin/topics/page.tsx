import React from 'react';
import Header from '@/components/Header';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function AdminTopicsPage() {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Verify user has ADMIN role
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (!roles?.some(r => r.role === 'ADMIN')) {
    redirect('/select-role');
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Topics Management</h1>
        {/* Add your admin topics management content here */}
      </div>
    </>
  );
}
