'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]); // Add supabase.auth to the dependency array

  if (loading) {
    return <div>Loading header...</div>;
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 shadow-md">
      <div>
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={120}
          height={32}
        />
      </div>
      {user ? (
        <div className="flex items-center space-x-3">
          <span className="text-sm">Welcome, {user.user_metadata?.firstName || user.email}</span>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(user.user_metadata?.firstName, user.user_metadata?.lastName)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mr-4">
              <DropdownMenuItem asChild>
                <Link href="/profile">View/Edit Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/select-role">Change Role</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => supabase.auth.signOut()}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div>
          <Link href="/login">Login</Link>
        </div>
      )}
    </header>
  );
}

const getInitials = (firstName: string = '', lastName: string = '') => {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};
