// hooks/useUser.ts
'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase/client';

interface UserWithProfile extends User {
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl: string;
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
        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from('Profile')
          .select('firstName, lastName, avatarUrl')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setUser({ ...authUser, profile: null });
        } else {
          setUser({ ...authUser, profile });
        }
      } catch (error) {
        console.error('Error in profile fetch:', error);
        setUser({ ...authUser, profile: null });
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [authUser, authLoading]);

  return { user, loading: loading || authLoading };
}
