// app/(authenticated)/profile/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';

export default async function ProfilePage() {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Get the user's profile
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select(`
      id,
      firstName,
      lastName,
      email,
      phone,
      avatarUrl,
      addressStreet,
      addressUnit,
      addressCity,
      addressState,
      addressZipcode
    `)
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    throw new Error('Failed to load profile');
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
        <ProfileForm initialData={profile} />
      </div>
    </div>
  );
}