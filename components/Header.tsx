// components/Header.tsx

'use client';

import { useState, useEffect } from 'react';
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

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  // Fetch the authenticated user's data
  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/user', {
        credentials: 'include', // Include credentials (cookies) in the request
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setProfile(data.profile);
      } else {
        setUser(null);
        setProfile(null);
      }
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (res.ok) {
      setUser(null);
      setProfile(null);
      router.replace('/login');
    } else {
      console.error('Error signing out');
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