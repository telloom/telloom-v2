'use client';

// This component initializes the user and profile state on the client side

import { useUserStore } from '@/stores/userStore';
import { User } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { Profile } from '@prisma/client';

interface UserProviderProps {
  initialUser: User | null;
  initialProfile: Profile | null;
  children: React.ReactNode;
}

export default function UserProvider({ initialUser, initialProfile, children }: UserProviderProps) {
  const setUser = useUserStore((state) => state.setUser);
  const setProfile = useUserStore((state) => state.setProfile);

  useEffect(() => {
    setUser(initialUser);
    setProfile(initialProfile);
  }, [initialUser, initialProfile, setUser, setProfile]);

  return <>{children}</>;
}