/**
 * File: components/Header.tsx
 * Description: The main header component for the application that handles user authentication state,
 * profile display, and navigation. Features include a logo, user avatar with dropdown menu for profile
 * actions, role switching, settings, and logout functionality.
 */

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Avatar as AvatarComponent, AvatarImage, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { UserPlus, Users, UserCircle, Settings, LogOut, SwitchCamera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import { createClient } from '@/utils/supabase/client';
import InviteModal from './invite/InviteModal';

function useCurrentRole() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<'SHARER' | 'LISTENER' | 'EXECUTOR' | null>(null);

  useEffect(() => {
    if (pathname?.includes('/role-sharer')) {
      setCurrentRole('SHARER');
    } else if (pathname?.includes('/role-listener')) {
      setCurrentRole('LISTENER');
    } else if (pathname?.includes('/role-executor')) {
      setCurrentRole('EXECUTOR');
    } else {
      setCurrentRole(null);
    }
  }, [pathname]);

  return currentRole;
}

export default function Header() {
  const { user } = useAuth();
  const { profile, setProfile } = useUserStore();
  const router = useRouter();
  const supabase = createClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const currentRole = useCurrentRole();

  // Fetch the user's profile and roles when user changes
  useEffect(() => {
    const fetchProfileAndRoles = async () => {
      if (!user) {
        setProfile(null);
        setUserRoles([]);
        return;
      }

      try {
        const [profileResult, rolesResult] = await Promise.all([
          supabase
            .from('Profile')
            .select('*')
            .eq('id', user.id)
            .single(),
          supabase
            .from('ProfileRole')
            .select('role')
            .eq('profileId', user.id)
        ]);

        if (profileResult.error) {
          console.error('Error fetching profile:', profileResult.error);
          return;
        }

        if (rolesResult.error) {
          console.error('Error fetching roles:', rolesResult.error);
          return;
        }

        setProfile(profileResult.data);
        setUserRoles(rolesResult.data.map(r => r.role));
      } catch (error) {
        console.error('Error fetching profile and roles:', error);
      }
    };

    fetchProfileAndRoles();
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

  const canInvite = userRoles.some(role => ['SHARER', 'EXECUTOR'].includes(role));

  const getConnectionsLink = () => {
    switch (currentRole) {
      case 'SHARER':
        return '/role-sharer/connections';
      case 'LISTENER':
        return '/role-listener/connections';
      case 'EXECUTOR':
        return '/role-executor/connections';
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3">
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
            {canInvite && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-2 border-[#1B4332] hover:bg-[#8fbc55] hover:text-[#1B4332] transition-all duration-300"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite</span>
              </Button>
            )}
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="w-full cursor-pointer">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>View/Edit Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/select-role" className="w-full cursor-pointer">
                    <SwitchCamera className="mr-2 h-4 w-4" />
                    <span>Change Role</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="w-full cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {getConnectionsLink() && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={getConnectionsLink()!} className="w-full cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Connections</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="w-full cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div>
            <Link href="/login">Login</Link>
          </div>
        )}

        {showInviteModal && (
          <InviteModal 
            open={showInviteModal} 
            onOpenChange={setShowInviteModal}
          />
        )}
      </div>
    </header>
  );
}

const getInitials = (firstName: string = '', lastName: string = '') => {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};