// components/UserProvider.tsx
'use client';

// This component initializes the user state on the client side

import { useUserStore } from '@/stores/userStore';
import { User } from '@supabase/supabase-js';
import { useEffect } from 'react';

interface UserProviderProps {
  initialUser: User | null;
  children: React.ReactNode;
}

export default function UserProvider({ initialUser, children }: UserProviderProps) {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser, setUser]);

  return <>{children}</>;
}