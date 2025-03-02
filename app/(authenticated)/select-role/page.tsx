// app/select-role/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SelectRoleClient from '@/components/SelectRoleClient';

export default async function SelectRolePage() {
  // Create server-side Supabase client
  const supabase = await createClient();
  
  try {
    // Get user with proper error handling
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error in select-role page:', error.message);
      redirect('/login');
    }
    
    if (!data.user) {
      redirect('/login');
    }
    
    // Pass the user ID to the client component to avoid redundant auth checks
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="w-full max-w-6xl px-4 py-6 md:py-8">
          <SelectRoleClient userId={data.user.id} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Unexpected error in select-role page:', error);
    redirect('/login');
  }
}
