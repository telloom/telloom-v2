// hooks/useUser.ts
'use client';

import { useEffect, useState } from 'react';
import { User, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface UserWithProfile extends User {
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl: string;
  } | null;
}

export function useUser() {
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log("Auth user:", user);
        if (error) throw error;

        if (user) {
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('Profile')
            .select('firstName, lastName, avatarUrl')
            .eq('id', user.id)
            .single();

          console.log("Profile data:", profile);

          if (profileError) throw profileError;

          setUser({ ...user, profile });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
      // Always verify user with getUser() after auth state changes
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user after auth state change:', error);
        setUser(null);
        return;
      }

      if (user) {
        const { data: profile } = await supabase
          .from('Profile')
          .select('firstName, lastName, avatarUrl')
          .eq('id', user.id)
          .single();

        setUser({ ...user, profile: profile || null });
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  console.log("Returning user:", user, "loading:", loading);
  return { user, loading };
}
