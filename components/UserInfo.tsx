'use client';

import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Button } from '@/app/_components/ui/button';
import { Avatar, AvatarFallback } from '@/app/_components/ui/avatar';

export default function UserInfo() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Optionally, redirect or update the UI
  };

  if (!user) {
    return null; // Handle unauthenticated users elsewhere
  }

  const userEmail = user.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="flex items-center space-x-3">
      <Avatar>
        {/* If no image, AvatarImage can be omitted */}
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