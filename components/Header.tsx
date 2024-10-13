'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HomeIcon, LogOutIcon, UserIcon, Settings, Users, Headphones, Briefcase } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';

interface HeaderProps {
  className?: string;
  profileId: string;
}

const roleIcons = {
  'role-admin': <Settings className="h-4 w-4" />,
  'role-sharer': <Users className="h-4 w-4" />,
  'role-listener': <Headphones className="h-4 w-4" />,
  'role-executor': <Briefcase className="h-4 w-4" />,
};

const Header: React.FC<HeaderProps> = ({ className, profileId }) => {
  const router = useRouter();
  const { profile, isLoading, error } = useProfile(profileId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleRoleChange = (role: string) => {
    // Implement role change logic here
    console.log(`Changing to ${role}`);
  };

  return (
    <header className={`flex justify-between items-center p-4 bg-white shadow-sm ${className}`}>
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/logo.png" alt="Telloom Logo" width={32} height={32} />
        <span className="text-xl font-bold">Telloom</span>
      </Link>

      {isLoading ? (
        <Button variant="ghost" disabled>Loading...</Button>
      ) : error ? (
        <Button variant="ghost" onClick={() => router.push('/login')}>Error: Please log in</Button>
      ) : profile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage src={profile.avatarUrl || ''} />
                <AvatarFallback>{profile.fullName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{profile.fullName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push('/')}>
              <HomeIcon className="mr-2 h-4 w-4" />
              <span>Home</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/profile/edit')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Edit Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleRoleChange('role-admin')}>
              {roleIcons['role-admin']}
              <span>Admin</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleRoleChange('role-sharer')}>
              {roleIcons['role-sharer']}
              <span>Sharer</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleRoleChange('role-listener')}>
              {roleIcons['role-listener']}
              <span>Listener</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleRoleChange('role-executor')}>
              {roleIcons['role-executor']}
              <span>Executor</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOutIcon className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button onClick={() => router.push('/login')}>Log In</Button>
      )}
    </header>
  );
};

export default Header;
