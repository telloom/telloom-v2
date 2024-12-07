// app/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  
  // Use getUser instead of getSession for better security
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Check user's role to determine where to redirect them
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (!roles || roles.length === 0) {
    redirect('/select-role');
  }

  // Redirect based on role
  if (roles.some(r => r.role === 'SHARER')) {
    redirect('/role-sharer');
  } else if (roles.some(r => r.role === 'LISTENER')) {
    redirect('/role-listener');
  } else if (roles.some(r => r.role === 'EXECUTOR')) {
    redirect('/role-executor');
  } else if (roles.some(r => r.role === 'ADMIN')) {
    redirect('/role-admin');
  }

  // If no matching role, redirect to role selection
  redirect('/select-role');
}
