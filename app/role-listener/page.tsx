import React from 'react';
import Header from '@/components/Header';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function ListenerPage() {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Verify user has LISTENER role
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (!roles?.some(r => r.role === 'LISTENER')) {
    redirect('/select-role');
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Listener Dashboard</h1>
        {/* Add your listener dashboard content here */}
      </div>
    </>
  );
}
