// app/(authenticated)/profile/page.tsx

import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';
import ClientWrapper from '@/components/ClientWrapper';
import BackButton from '@/components/profile/BackButton';
import { getUSStates } from '@/utils/states';

export default async function ProfilePage() {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    notFound();
  }

  // Get the user's profile
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Get US states from the database
  const states = await getUSStates();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
        <ClientWrapper>
          <ProfileForm initialData={profile} states={states} />
        </ClientWrapper>
      </div>
    </div>
  );
}