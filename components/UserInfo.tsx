'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, AuthChangeEvent } from '@supabase/supabase-js';

export default function UserInfo() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  const getUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase.auth]);

  useEffect(() => {
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await getUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth, getUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // The UI will update automatically due to the auth state change listener
  };

  if (!user) {
    return null; // Handle unauthenticated users elsewhere
  }

  const userEmail = user.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="flex items-center space-x-3">
      <Avatar>
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">{userEmail}</p>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
