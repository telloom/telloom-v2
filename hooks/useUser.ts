// hooks/useUser.ts
// This hook provides user authentication and role information.

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface UseUser {
  user: User | null;
  roles: string[];
  logout: () => void;
}

export const useUser = (): UseUser => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const fetchRoles = async () => {
        if (session?.user) {
          const { data } = await supabase
            .from('ProfileRole')
            .select('role')
            .eq('profileId', session.user.id);

          if (data) {
            setRoles(data.map((item: { role: string }) => item.role));
          }
        }
      };

      fetchRoles();

      // Listen for authentication changes
      supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      });
    };

    fetchSession();

    return () => {
      // ... rest of the useEffect cleanup
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
  };

  return { user, roles, logout };
};
