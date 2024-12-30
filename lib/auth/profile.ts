import { createClient } from '@/utils/supabase/server';

export async function getProfile(authHeader: string) {
  try {
    const supabase = createClient();
    
    // Get the current user's session
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return null;
    }

    // Get the profile with roles and ProfileSharer data
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select(`
        id,
        firstName,
        lastName,
        email,
        avatarUrl,
        ProfileRole (
          id,
          role
        ),
        ProfileSharer (
          id
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting profile:', profileError);
      return null;
    }

    if (!profile) {
      console.error('No profile found');
      return null;
    }

    // Check if user has SHARER role
    const hasSharerRole = profile.ProfileRole?.some(role => role.role === 'SHARER');
    if (!hasSharerRole) {
      console.error('User does not have SHARER role');
      return null;
    }

    // Get or create ProfileSharer record
    let sharerId = profile.ProfileSharer?.id;
    if (!sharerId) {
      // Try to get existing ProfileSharer record first
      const { data: existingSharer, error: getError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', profile.id)
        .single();

      if (!getError && existingSharer) {
        sharerId = existingSharer.id;
      } else {
        // Create ProfileSharer record if it doesn't exist
        const { data: sharer, error: sharerError } = await supabase
          .from('ProfileSharer')
          .upsert({
            profileId: profile.id,
            subscriptionStatus: true
          }, {
            onConflict: 'profileId'
          })
          .select('id')
          .single();

        if (sharerError) {
          console.error('Error creating ProfileSharer:', sharerError);
          return null;
        }

        sharerId = sharer.id;
      }
    }

    if (!sharerId) {
      console.error('Failed to get or create ProfileSharer record');
      return null;
    }

    return {
      ...profile,
      sharerId
    };
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
} 