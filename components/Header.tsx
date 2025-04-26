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
import { UserPlus, Users, UserCircle, Settings, LogOut, SwitchCamera, Bell, BellRing, CircleDot, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import InviteModal from './invite/InviteModal';
import NotificationsBadge from '@/components/notifications/NotificationsBadge';
import useSWR from 'swr';
import { toast } from 'sonner';
import { normalizeAvatarUrl, getSignedAvatarUrl } from '@/utils/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from './ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Restore NotificationsData interface
interface NotificationsData {
  notifications: Notification[];
}

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

// Define interfaces for type safety
interface Notification {
  id: string;
  [key: string]: any;
}

/**
 * Gets initials from a user's name
 */
const getInitials = (firstName: string = '', lastName: string = '') => {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};

export default function Header() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile } = useUserStore();
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string | null>(null);
  const currentRole = useCurrentRole();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  useEffect(() => {
    const updateAvatar = async () => {
      if (profile?.avatarUrl) {
        const normalizedUrl = normalizeAvatarUrl(profile.avatarUrl);
        setAvatarUrl(normalizedUrl);
        try {
          const signedUrl = await getSignedAvatarUrl(normalizedUrl);
          setSignedAvatarUrl(signedUrl);
        } catch (error) {
          console.error('[HEADER] Error getting signed avatar URL:', error);
          setSignedAvatarUrl(normalizedUrl); // Fallback
        }
      } else {
        setAvatarUrl(null);
        setSignedAvatarUrl(null);
      }
    };

    if (profile) { 
      console.log('[HEADER] Profile updated, updating avatar.');
      updateAvatar();
    } else {
      console.log('[HEADER] No profile, clearing avatar.');
      setAvatarUrl(null);
      setSignedAvatarUrl(null);
    }
  }, [profile]);

  const handleSignOut = async () => {
    try {
      console.log('[HEADER] Signing out...');
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const userRoles = profile?.roles?.map(r => r.role) || [];
  
  const canInvite = userRoles.some(role => ['SHARER', 'EXECUTOR'].includes(role));

  const getConnectionsLink = () => {
    // Determine based on currentRole state derived from pathname
    switch (currentRole) {
      case 'SHARER':
        return '/role-sharer/connections';
      case 'LISTENER':
        return '/role-listener/connections';
      case 'EXECUTOR':
        return '/role-executor/connections';
      default:
        return ''; // Return empty string if no specific role context
    }
  };

  // Define a typed fetcher function
  const fetcher = (url: string): Promise<NotificationsData> => fetch(url).then(res => res.json());

  // Fetch notifications
  const { data: notificationsData, mutate: mutateNotifications } = useSWR<NotificationsData>(
    user ? '/api/notifications' : null, // Only fetch if user is authenticated
    fetcher
  );

  const recentNotifications = notificationsData?.notifications?.slice(0, 3) || [];

  // Notification item component to reuse in both dropdown and sheet
  const NotificationItem = ({ 
    notification, 
    onSelect, 
    closeSheet 
  }: { 
    notification: Notification, 
    onSelect: () => void,
    closeSheet?: () => void
  }) => (
    <div
      className="flex items-start gap-2 py-3 px-4 cursor-pointer hover:bg-[#8fbc55] hover:text-white"
      onClick={() => {
        onSelect();
        if (closeSheet) closeSheet();
      }}
    >
      {!notification.isRead && (
        <CircleDot className="h-2 w-2 mt-1.5 shrink-0 text-[#8fbc55]" />
      )}
      <div className={`${!notification.isRead ? 'font-medium' : ''}`}>
        {notification.message}
        <div className="text-xs text-muted-foreground mt-1 group-hover:text-white/80">
          {new Date(notification.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );

  // Profile menu item component to reuse in both dropdown and sheet
  const ProfileMenuItem = ({ 
    icon, 
    label, 
    href, 
    onClick,
    closeSheet
  }: { 
    icon: React.ReactNode, 
    label: string, 
    href?: string, 
    onClick?: () => void,
    closeSheet?: () => void
  }) => {
    const content = (
      <div className="flex items-center gap-2 py-3 px-4 cursor-pointer hover:bg-[#8fbc55] hover:text-white">
        {icon}
        <span>{label}</span>
      </div>
    );

    if (href) {
      return (
        <Link 
          href={href} 
          className="w-full"
          onClick={() => {
            if (closeSheet) closeSheet();
          }}
        >
          {content}
        </Link>
      );
    }

    return (
      <div 
        onClick={() => {
          if (onClick) onClick();
          if (closeSheet) closeSheet();
        }} 
        className="w-full"
      >
        {content}
      </div>
    );
  };

  const handleNotificationSelect = async (notification: Notification) => {
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

      // Close the sheet/dropdown
      setNotificationsOpen(false);

      // Navigate to the centralized notifications page
      router.push('/notifications');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };
  
  const renderAuthLoading = authLoading;
  const renderAuthenticated = !authLoading && user && profile;
  const renderUnauthenticated = !authLoading && !user;
  const renderProfileStillLoading = !authLoading && user && !profile;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3">
        <div>
          <Link href="/">
            <Image
              src="/images/Telloom Logo V1-Horizontal Green.png"
              alt="Telloom Logo"
              width={104}
              height={26}
              priority={true}
              quality={100}
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: 'auto'
              }}
            />
          </Link>
        </div>
        
        {(renderAuthLoading || renderProfileStillLoading) && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#1B4332] border-t-transparent animate-spin"></div>
            <span className="text-sm">Loading...</span>
          </div>
        )}
        
        {renderAuthenticated && (
          <div className="flex items-center space-x-3">
            {canInvite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="gap-2 rounded-full border-[1px] hover:bg-[#1B4332] hover:text-white transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <SheetTrigger asChild>
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
                  </SheetTrigger>
                  <SheetContent side="top" className="max-h-[80vh] overflow-y-auto pt-10">
                    <SheetHeader className="flex flex-row items-center justify-between border-b pb-2">
                      <SheetTitle className="text-lg font-semibold text-[#1B4332]">Notifications</SheetTitle>
                      <SheetClose className="rounded-full p-1 hover:bg-[#8fbc55] hover:text-white">
                        <X className="h-5 w-5" />
                      </SheetClose>
                    </SheetHeader>
                    <div className="mt-4">
                      {recentNotifications.length > 0 ? (
                        <>
                          {recentNotifications.map((notification: Notification) => (
                            <NotificationItem 
                              key={notification.id} 
                              notification={notification} 
                              onSelect={() => handleNotificationSelect(notification)}
                              closeSheet={() => setNotificationsOpen(false)}
                            />
                          ))}
                          <div className="border-t pt-2 pb-2 px-4 mt-2">
                            <Link 
                              href="/notifications"
                              className="w-full block text-center text-sm text-[#1B4332] hover:text-[#8fbc55]"
                              onClick={() => setNotificationsOpen(false)}
                            >
                              View all notifications
                            </Link>
                          </div>
                        </>
                      ) : (
                        <div className="py-3 px-4 text-center text-muted-foreground">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
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
                        {recentNotifications.map((notification: Notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className="py-3 px-4 cursor-pointer"
                            onClick={() => handleNotificationSelect(notification)}
                          >
                            <div className="flex items-start gap-2">
                              {!notification.isRead && (
                                <CircleDot className="h-2 w-2 mt-1.5 shrink-0 text-[#8fbc55]" />
                              )}
                              <div className={`${!notification.isRead ? 'font-medium' : ''}`}>
                                {notification.message}
                                <div className="text-xs text-muted-foreground mt-1 group-hover:text-white/80">
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
              )}
              <span className="text-sm hidden sm:inline">
                 Welcome, {profile?.firstName || 'User'} 
              </span>
            </div>
            
            {isMobile ? (
              <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
                <SheetTrigger asChild>
                  <button className="focus:outline-none">
                    <AvatarComponent className="h-8 w-8">
                      {signedAvatarUrl || avatarUrl ? (
                        <AvatarImage
                          src={signedAvatarUrl || avatarUrl || ''}
                          alt="Profile"
                          className="object-cover"
                          onError={() => {
                            setSignedAvatarUrl(avatarUrl);
                          }}
                        />
                      ) : (
                        <AvatarFallback>
                          {profile?.firstName ? getInitials(profile.firstName, profile.lastName) : 'U'}
                        </AvatarFallback>
                      )}
                    </AvatarComponent>
                  </button>
                </SheetTrigger>
                <SheetContent side="top" className="max-h-[80vh] overflow-y-auto pt-10">
                  <SheetHeader className="flex flex-row items-center justify-between border-b pb-2">
                    <SheetTitle className="text-lg font-semibold text-[#1B4332]">
                       {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : user?.email || 'User'}
                    </SheetTitle>
                    <SheetClose className="rounded-full p-1 hover:bg-[#8fbc55] hover:text-white">
                      <X className="h-5 w-5" />
                    </SheetClose>
                  </SheetHeader>
                  <div className="mt-4">
                    <ProfileMenuItem 
                      icon={<UserCircle className="h-5 w-5 text-[#1B4332]" />} 
                      label="View/Edit Profile" 
                      href="/profile"
                      closeSheet={() => setProfileOpen(false)}
                    />
                    <ProfileMenuItem 
                      icon={<SwitchCamera className="h-5 w-5 text-[#1B4332]" />} 
                      label="Change Role" 
                      href="/select-role"
                      closeSheet={() => setProfileOpen(false)}
                    />
                    <ProfileMenuItem 
                      icon={<Settings className="h-5 w-5 text-[#1B4332]" />} 
                      label="Settings" 
                      href="/settings"
                      closeSheet={() => setProfileOpen(false)}
                    />
                    {getConnectionsLink() && (
                      <ProfileMenuItem 
                        icon={<Users className="h-5 w-5 text-[#1B4332]" />} 
                        label="Connections" 
                        href={getConnectionsLink() || ''}
                        closeSheet={() => setProfileOpen(false)}
                      />
                    )}
                    <div className="border-t mt-2"></div>
                    <ProfileMenuItem 
                      icon={<LogOut className="h-5 w-5 text-[#1B4332]" />} 
                      label="Logout" 
                      onClick={() => {
                        setProfileOpen(false);
                        handleSignOut();
                      }}
                      closeSheet={() => setProfileOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
                <DropdownMenuTrigger>
                  <AvatarComponent className="h-8 w-8">
                    {signedAvatarUrl || avatarUrl ? (
                      <AvatarImage
                        src={signedAvatarUrl || avatarUrl || ''}
                        alt="Profile"
                        className="object-cover"
                        onError={() => {
                          setSignedAvatarUrl(avatarUrl);
                        }}
                      />
                    ) : (
                      <AvatarFallback>
                        {profile?.firstName ? getInitials(profile.firstName, profile.lastName) : 'U'}
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
            )}
          </div>
        )}
        
        {renderUnauthenticated && (
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