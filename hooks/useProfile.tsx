import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Profile } from '@prisma/client';
import prisma from '@/lib/prisma'; // Assume you have this set up

export function useProfile(profileId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('No authenticated user');
        }

        const profile = await prisma.profile.findUnique({
          where: { id: profileId },
        });

        if (!profile) {
          throw new Error('Profile not found');
        }

        setProfile(profile);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [profileId]);

  return { profile, isLoading, error };
}