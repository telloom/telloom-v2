// hooks/useUser.ts
'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { getProfileSafely } from '@/utils/supabase/client-helpers';

interface UserWithProfile extends User {
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    displayName?: string;
    email?: string;
  } | null;
}

export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch profile when auth is loaded and we have a user
    if (authLoading) {
      return;
    }

    async function getProfile() {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[useUser] Fetching profile safely');
        // Use the new helper function to avoid direct table queries
        const profileData = await getProfileSafely(authUser.id);

        if (!profileData) {
          console.error('[useUser] No profile data found');
          setUser({ ...authUser, profile: null });
        } else {
          const profile = {
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            avatarUrl: profileData.avatarUrl,
            displayName: profileData.displayName || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || authUser.email,
            email: profileData.email || authUser.email
          };
          setUser({ ...authUser, profile });
        }
      } catch (error) {
        console.error('[useUser] Error in profile fetch:', error);
        setUser({ ...authUser, profile: null });
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [authUser, authLoading]);

  return { user, loading: loading || authLoading };
}
