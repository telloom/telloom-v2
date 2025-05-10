// app/(authenticated)/profile/page.tsx

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';
import ClientWrapper from '@/components/ClientWrapper';
import BackButton from '@/components/profile/BackButton';
import { getUSStates } from '@/utils/states';
import { Profile } from '@/types/models'; // Assuming you have a Profile type definition
import { ProfileFormData } from '@/components/profile/ProfileForm'; // Added import

export default async function ProfilePage() {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('[ProfilePage] User not found or error fetching user:', userError);
    notFound();
  }

  // Get the user's profile using the SAFE RPC function
  // This function uses SECURITY DEFINER and bypasses RLS for this specific fetch
  console.log(`[ProfilePage] Fetching profile via RPC for user: ${user.id}`);
  const { data: profileData, error: profileRpcError } = await supabase
    .rpc('get_profile_safe', { target_user_id: user.id }); // Pass user.id to the function

  // The RPC returns a JSONB object, not a direct row like .select().single()
  const profileResult: Profile | null = profileData as Profile | null;

  if (profileRpcError || !profileResult || !profileResult.id) { // Check if profile object or its id is null/undefined
    console.error('[ProfilePage] Profile not found via RPC or error fetching profile', {
      userId: user?.id,
      profileRpcError,
      profileData // Log the raw data received from RPC
    });
    notFound(); // Call notFound if RPC fails or returns no valid profile data
  }

  console.log('[ProfilePage] Successfully fetched profile via RPC:', profileResult.id);

  // Sanitize the profile data to match ProfileFormData
  const sanitizedProfile: ProfileFormData = {
    id: profileResult.id,
    firstName: profileResult.firstName ?? null,
    lastName: profileResult.lastName ?? null,
    email: profileResult.email ?? null,
    phone: profileResult.phone ?? null, // Ensure phone is string or null
    avatarUrl: profileResult.avatarUrl ?? null,
    addressStreet: profileResult.addressStreet ?? null,
    addressUnit: profileResult.addressUnit ?? null,
    addressCity: profileResult.addressCity ?? null,
    addressState: profileResult.addressState ?? null,
    addressZipcode: profileResult.addressZipcode ?? null,
  };

  // Get US states from the database
  const states = await getUSStates();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
        <ClientWrapper>
          <ProfileForm initialData={sanitizedProfile} states={states} />
        </ClientWrapper>
      </div>
    </div>
  );
}