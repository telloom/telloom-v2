/**
 * File: components/Header.tsx
 * Description: The main header component for the application that handles user authentication state,
 * profile display, and navigation. Features include a logo, user avatar with dropdown menu for profile
 * actions, role switching, settings, and logout functionality.
 */

'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar as AvatarComponent, AvatarImage, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import { createClient } from '@/utils/supabase/client';

export default function Header() {
  const { user } = useAuth();
  const { profile, setProfile } = useUserStore();
  const router = useRouter();
  const supabase = createClient();

  // Fetch the user's profile when user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('Profile')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfile(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user, setProfile, supabase]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      
      setProfile(null);
      router.replace('/login');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 shadow-md">
      <div>
        <Link href="/">
          <Image
            src="/images/Telloom Logo V1-Horizontal Green.png"
            alt="Telloom Logo"
            width={120}
            height={27}
            style={{ width: 'auto', height: 'auto' }}
            priority
            className="w-[120px]"
          />
        </Link>
      </div>
      {user ? (
        <div className="flex items-center space-x-3">
          <span className="text-sm">
            Welcome, {profile?.firstName || user.email}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <AvatarComponent className="h-8 w-8">
                {profile?.avatarUrl ? (
                  <AvatarImage
                    src={profile.avatarUrl}
                    alt={`${profile?.firstName}'s avatar`}
                  />
                ) : (
                  <AvatarFallback>
                    {getInitials(profile?.firstName ?? '', profile?.lastName ?? '')}
                  </AvatarFallback>
                )}
              </AvatarComponent>
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
              <DropdownMenuItem onClick={handleSignOut}>
                Logout
              </DropdownMenuItem>
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