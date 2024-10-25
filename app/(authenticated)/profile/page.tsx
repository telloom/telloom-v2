import React from 'react';
import { createClient } from '@/utils/supabase/server';
import UserProfile from '@/components/UserProfile';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

export default async function ProfilePage() {
  const supabase = createClient();

  // Fetch the user's profile data
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Handle the case where there's no authenticated user
    return <div>Please log in to view your profile.</div>;
  }

  // Fetch the user's profile data from the Profile table
  const { data: profile, error } = await supabase
    .from('Profile')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return <div>Error loading profile. Please try again later.</div>;
  }

  // Combine user and profile data
  const initialData = {
    ...profile,
    email: user.email,
    id: user.id,
    updatedAt: profile?.updatedAt || new Date().toISOString(),
  };

  return (
    <AuthenticatedLayout>
      <h1>Profile Page</h1>
      <UserProfile initialData={initialData} />
    </AuthenticatedLayout>
  );
}
