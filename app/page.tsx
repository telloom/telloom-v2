// app/page.tsx
import { redirect } from 'next/navigation';
import { getUser } from '@/utils/supabase/server';
import { Role } from '@/types/models';

export default async function HomePage() {
  const { user, roles, error } = await getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  if (!roles || roles.length === 0) {
    redirect('/select-role');
  }

  // Redirect based on role (prioritizing ADMIN)
  if (roles.some(r => r.role === Role.ADMIN)) {
    redirect('/role-admin');
  } else if (roles.some(r => r.role === Role.SHARER)) {
    redirect('/role-sharer');
  } else if (roles.some(r => r.role === Role.LISTENER)) {
    redirect('/role-listener');
  } else if (roles.some(r => r.role === Role.EXECUTOR)) {
    redirect('/role-executor');
  }

  // If no matching role, redirect to role selection
  redirect('/select-role');
}
