'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
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
        if (error) throw error;

        if (user) {
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('Profile')
            .select('firstName, lastName, avatarUrl')
            .eq('id', user.id)
            .single();

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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('Profile')
          .select('firstName, lastName, avatarUrl')
          .eq('id', session.user.id)
          .single();

        setUser({ ...session.user, profile: profile || null });
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
