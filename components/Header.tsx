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
  DropdownMenuFooter,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { UserPlus, Users, UserCircle, Settings, LogOut, SwitchCamera, Bell, BellRing, CircleDot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import { createClient } from '@/utils/supabase/client';
import InviteModal from './invite/InviteModal';
import NotificationsBadge from '@/components/notifications/NotificationsBadge';
import useSWR from 'swr';
import { toast } from 'sonner';

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

  const getNotificationsLink = () => {
    // Always return the centralized notifications page
    return '/notifications';
  };

  // Fetch notifications
  const { data: notificationsData, mutate: mutateNotifications } = useSWR('/api/notifications', (url) => 
    fetch(url).then(res => res.json())
  );

  const recentNotifications = notificationsData?.notifications?.slice(0, 3) || [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3">
        <div>
          <Link href="/">
            <Image
              src="/images/Telloom Logo V1-Horizontal Green.png"
              alt="Telloom Logo"
              width={180}
              height={52}
              priority={true}
              quality={100}
              style={{
                width: '120px',
                height: 'auto',
                maxWidth: '100%'
              }}
            />
          </Link>
        </div>
        {user ? (
          <div className="flex items-center space-x-3">
            {canInvite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="gap-2 rounded-full border-[1px] hover:bg-[#1B4332] hover:text-white transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            )}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="group relative inline-flex items-center justify-center w-10 h-10 focus:outline-none"
                    aria-label="View notifications"
                  >
                    <Bell className="h-5 w-5 text-foreground group-hover:hidden transition-colors" />
                    <BellRing className="h-5 w-5 text-[#1B4332] hidden group-hover:block transition-colors" />
                    <div className="absolute -top-1 -right-1">
                      <NotificationsBadge />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="py-2 px-4 font-semibold border-b">
                    Notifications
                  </div>
                  {recentNotifications.length > 0 ? (
                    <>
                      {recentNotifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="py-3 px-4 cursor-pointer"
                          onClick={async () => {
                            try {
                              // Mark as read
                              const res = await fetch(`/api/notifications/${notification.id}/mark-read`, {
                                method: 'POST',
                              });

                              if (!res.ok) {
                                throw new Error('Failed to mark notification as read');
                              }

                              // Update notifications data
                              await mutateNotifications();

                              // Navigate to the centralized notifications page
                              router.push('/notifications');
                            } catch (error) {
                              console.error('Error marking notification as read:', error);
                              toast.error('Failed to mark notification as read');
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.isRead && (
                              <CircleDot className="h-2 w-2 mt-1.5 shrink-0 text-[#8fbc55]" />
                            )}
                            <div className={`${!notification.isRead ? 'font-medium' : ''}`}>
                              {notification.message}
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="py-2 px-4">
                        <Link 
                          href="/notifications"
                          className="w-full text-center text-sm text-[#1B4332] hover:text-[#8fbc55]"
                        >
                          View all notifications
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <div className="py-3 px-4 text-center text-muted-foreground">
                      No new notifications
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-sm">
                Welcome, {profile?.firstName || user.email}
              </span>
            </div>
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