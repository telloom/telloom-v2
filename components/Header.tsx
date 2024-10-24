'use client';

import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';

export default function Header() {
  const { user, loading } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <header className="flex items-center justify-between p-4 shadow-md">
      <Image
        src="/Telloom Logo V1-Horizontal Green.png"
        alt="Telloom Logo"
        width={150}
        height={40}
      />
      {user ? (
        <div className="flex items-center space-x-4">
          <span className="text-sm">Welcome, {user.profile?.firstName || user.email}</span>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                <AvatarImage src={user.profile?.avatarUrl} />
                <AvatarFallback>{getInitials(`${user.profile?.firstName} ${user.profile?.lastName}`)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>View/Edit Profile</DropdownMenuItem>
              <DropdownMenuItem>Change Role</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </header>
  );
}

const getInitials = (name: string = '') => {
  const names = name.split(' ');
  return names.map(n => n[0]).join('').toUpperCase();
};
