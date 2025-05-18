/**
 * File: components/Header.tsx
 * Description: The main header component for the application that handles user authentication state,
 * profile display, and navigation. Features include a logo, user avatar with dropdown menu for profile
 * actions, role switching, settings, and logout functionality.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { Avatar as AvatarComponent, AvatarImage, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { UserPlus, Users, UserCircle, Settings, LogOut, SwitchCamera, Bell, BellRing, CircleDot, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import InviteModal from './invite/InviteModal';
import NotificationsBadge from '@/components/notifications/NotificationsBadge';
import useSWR, { useSWRConfig } from 'swr';
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
import Logo from '@/components/Logo';
import { createClient } from '@/utils/supabase/client';
import ExecutorInviteModal from '@/components/executor/connections/ExecutorInviteModal';
import { useCurrentRole } from '@/hooks/useCurrentRole';

// Define interfaces for type safety
interface Notification {
  id: string;
  type: 'INVITATION' | 'FOLLOW_REQUEST_RECEIVED' | string;
  message: string; // This message might be pre-formatted by the backend for executors
  isRead: boolean;
  createdAt: string;
  related_entity_id?: string; // Still useful for linking
  
  // Fields from the new SQL function structure
  actingForSharerInfo?: {
    sharerId: string; // ProfileSharer.id
    sharerProfileId: string; // Profile.id of the sharer
    sharerFirstName: string;
    sharerLastName: string;
  };
  followRequestData?: {
    followRequestId: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED';
    requestorProfileId: string;
    requestorFirstName: string;
    requestorLastName: string;
    requestorEmail: string;
  };
  invitationData?: {
    invitationId: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    inviteeEmail: string;
    role: string;
    sharerId: string; // ProfileSharer.id of the sharer related to the invitation context
  };

  // Keep original data field for any other miscellaneous data from Notification.data JSON
  data?: {
    // Removed invitationId, followRequestId, followRequestStatus from here
    // as they are now in specific top-level fields.
    requestorFirstName?: string; // Could be part of original_notification_data if not in followRequestData
    requestorLastName?: string; // Could be part of original_notification_data
    [key: string]: any;
  };
  [key: string]: any; // For any other dynamic properties
}

// Restore NotificationsData interface
interface NotificationsData {
  notifications: Notification[];
}

interface NotificationsCountData {
  count: number;
}

/**
 * Gets initials from a user's name
 */
const getInitials = (firstName: string = '', lastName: string = '') => {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};

// Fetcher function (keep as is)
const fetcher = (url: string): Promise<any> => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
});

export default function Header() {
  const supabase = createClient();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile } = useUserStore();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string | null>(null);
  const currentRoleFromPath = useCurrentRole(); // Role derived from path
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  useSWRConfig(); // Removed mutate as it's not used directly, but useSWRConfig might have side effects or be used by other hooks implicitly.
  const [isSharerInviteModalOpen, setIsSharerInviteModalOpen] = useState(false);
  const [isExecutorInviteModalOpen, setIsExecutorInviteModalOpen] = useState(false);

  console.log("[HEADER RENDER] Profile from useUserStore:", profile); // Keep log temporarily

  // SWR hooks for notifications and count
  // Remove sharerId specific query param, backend will handle visibility for executors
  const notificationsKey = `/api/notifications?countOnly=false`;
  const unreadNotificationsCountKey = `/api/notifications?count=true`;

  const { data: notificationsData, mutate: mutateNotifications } = useSWR<NotificationsData>(notificationsKey, fetcher);
  const { data: unreadCountData, mutate: mutateUnreadCount } = useSWR<NotificationsCountData>(unreadNotificationsCountKey, fetcher, { refreshInterval: 30000 });

  // --- NEW: Function to mark all notifications as read ---
  const markAllNotificationsRead = useCallback(async () => {
    if (!user || !notificationsData || !unreadCountData || unreadCountData.count === 0) {
      console.log('[HEADER markAllNotificationsRead] Skipped: conditions not met.', { user, notificationsData, unreadCountData });
      return;
    }

    console.log('[HEADER markAllNotificationsRead] Attempting to mark all notifications as read...');
    console.log('[HEADER markAllNotificationsRead] notificationsData BEFORE optimistic update:', JSON.parse(JSON.stringify(notificationsData)));

    // Optimistically update the count
    mutateUnreadCount({ count: 0 }, false); 

    // Optimistically update the list using functional update
    mutateNotifications(
      (currentData) => {
        if (!currentData || !currentData.notifications) {
          console.log('[HEADER markAllNotificationsRead] Optimistic mutate: currentData or notifications missing.');
          return currentData; 
        }
        const newNotifications = currentData.notifications.map(n => ({ ...n, isRead: true }));
        console.log('[HEADER markAllNotificationsRead] Optimistic mutate: newNotifications mapped:', JSON.parse(JSON.stringify(newNotifications.slice(0,2)))); // Log first 2 for brevity
        return { ...currentData, notifications: newNotifications };
      }, 
      false // revalidate: false
    );
    console.log('[HEADER markAllNotificationsRead] notificationsData AFTER optimistic mutate call (SWR cache might not be synchronous).');

    try {
      const { error } = await supabase.rpc('mark_all_notifications_read_safe');

      if (error) {
        throw new Error(error.message || 'Failed to mark notifications as read');
      }

      console.log('[HEADER] Successfully marked notifications as read via API.');
      // Now that RPC is successful, trigger revalidation for both count and list
      mutateUnreadCount(); // Revalidate count from server
      console.log('[HEADER markAllNotificationsRead] Called mutateUnreadCount() for revalidation.');
      mutateNotifications(); // Revalidate notifications list from server
      console.log('[HEADER markAllNotificationsRead] Called mutateNotifications() for revalidation. SWR will fetch fresh data.');

    } catch (error) {
      console.error('[HEADER] Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read.');
      mutateNotifications(); 
      mutateUnreadCount(); 
    }
  }, [user, notificationsData, unreadCountData, mutateNotifications, mutateUnreadCount, supabase]);

  useEffect(() => {
    // Add a log to see SWR data changes for notificationsData
    if (notificationsData) {
      console.log('[HEADER useEffect notificationsData] SWR notificationsData updated:', JSON.parse(JSON.stringify(notificationsData.notifications.slice(0,2))));
    }
  }, [notificationsData]);

  const handleNotificationsToggle = (open: boolean) => {
    setNotificationsOpen(open);
    if (open && unreadCountData && unreadCountData.count > 0) {
       markAllNotificationsRead();
    }
  };

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

  useEffect(() => {
    const updateSignedAvatarUrl = async () => {
      if (avatarUrl) {
        try {
          const signedUrl = await getSignedAvatarUrl(avatarUrl);
          setSignedAvatarUrl(signedUrl);
        } catch (error) {
          console.error('[HEADER] Error getting signed avatar URL:', error);
          setSignedAvatarUrl(avatarUrl); // Fallback
        }
      }
    };

    if (avatarUrl) {
      console.log('[HEADER] Avatar updated, updating signed avatar URL.');
      updateSignedAvatarUrl();
    }
  }, [avatarUrl]);

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

  // Simplified check for user's ability to invite based *only* on profile roles
  const userRoles = profile?.roles?.map(r => r.role) || [];
  console.log('[HEADER] userRoles:', userRoles); // Keep log temporarily
  const canInvite = userRoles.some(role => ['SHARER', 'EXECUTOR'].includes(role));
  console.log('[HEADER] canInvite:', canInvite); // Keep log temporarily

  // Determine if the invite button should be shown based on SPECIFIC paths AND user's ability to invite
  const isSharerPath = currentRoleFromPath === 'SHARER' && pathname?.startsWith('/role-sharer');
  const isSpecificExecutorPath = currentRoleFromPath === 'EXECUTOR' && pathname?.match(/^\/role-executor\/[a-f0-9-]+\/?(.*)/);
  
  const shouldShowInviteButton = 
    canInvite && 
    (isSharerPath || isSpecificExecutorPath);
    
  console.log('[HEADER] Path:', pathname, ', RoleFromPath:', currentRoleFromPath, ', CanInvite:', canInvite, ', ShowButton:', shouldShowInviteButton); // Keep log temporarily

  const getConnectionsLink = () => {
    if (currentRoleFromPath === 'SHARER') {
      return '/role-sharer/connections';
    } else if (currentRoleFromPath === 'EXECUTOR' && params?.id) {
      return `/role-executor/${params.id}/connections`;
    } else if (currentRoleFromPath === 'LISTENER') {
      return '/role-listener/connections';
    }
    return null;
  };

  // State for dropdown actions
  const [processingNotificationId, setProcessingNotificationId] = useState<string | null>(null);
  const [processedNotifications, setProcessedNotifications] = useState<Record<string, 'accepted' | 'declined'>>({});

  const handleDropdownAccept = async (event: React.MouseEvent, notification: Notification) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent closing dropdown / navigation

    const invitationId = notification.related_entity_id || notification.invitationData?.invitationId;
    if (!invitationId || processingNotificationId || processedNotifications[notification.id]) return;

    setProcessingNotificationId(notification.id);
    try {
      const { data, error } = await supabase
        .rpc('accept_invitation_by_id', { p_invitation_id: invitationId });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to accept invitation.');
      }

      toast.success('Invitation accepted!');
      setProcessedNotifications(prev => ({ ...prev, [notification.id]: 'accepted' }));
      await mutateNotifications(); // Refresh notifications list
      await mutateUnreadCount(); // Refresh count might be needed if accept removes notification

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation.');
    } finally {
      setProcessingNotificationId(null);
    }
  };

  // Handler for declining from dropdown
  const handleDropdownDecline = async (event: React.MouseEvent, notification: Notification) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent closing dropdown / navigation

    const invitationId = notification.related_entity_id || notification.invitationData?.invitationId;
     if (!invitationId || processingNotificationId || processedNotifications[notification.id]) return;

    setProcessingNotificationId(notification.id);
    try {
      const { data, error } = await supabase
        .rpc('decline_invitation_by_id', { p_invitation_id: invitationId });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to decline invitation.');
      }

      toast.success('Invitation declined.');
      setProcessedNotifications(prev => ({ ...prev, [notification.id]: 'declined' }));
       await mutateNotifications(); // Refresh notifications list
       await mutateUnreadCount(); // Refresh count might be needed if decline removes notification

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decline invitation.');
    } finally {
      setProcessingNotificationId(null);
    }
  };

  const handleFollowRequestAccept = async (event: React.MouseEvent, notification: Notification) => {
    event.preventDefault();
    event.stopPropagation();
    if (!notification.followRequestData?.followRequestId) {
      toast.error("Error: Follow Request ID is missing.");
      return;
    }
    setProcessingNotificationId(notification.id);
    try {
      const { error: rpcError } = await supabase.rpc('handle_follow_request_response', {
        request_id: notification.followRequestData.followRequestId, // Use new data structure
        should_approve: true,
      });

      if (rpcError) {
        throw rpcError;
      }

      await supabase.rpc('mark_notifications_read_safe', {
        p_notification_ids: [notification.id],
      });

      toast.success('Follow request approved!');
      mutateNotifications();
      mutateUnreadCount();
      setProcessedNotifications(prev => ({ ...prev, [notification.id]: 'accepted' }));
    } catch (error: any) {
      console.error('Error approving follow request:', error);
      toast.error(`Failed to approve follow request: ${error.message}`);
    } finally {
      setProcessingNotificationId(null);
    }
  };

  const handleFollowRequestDecline = async (event: React.MouseEvent, notification: Notification) => {
    event.preventDefault();
    event.stopPropagation();
    if (!notification.followRequestData?.followRequestId) {
      toast.error("Error: Follow Request ID is missing.");
      return;
    }
    setProcessingNotificationId(notification.id);
    try {
      const { error: rpcError } = await supabase.rpc('handle_follow_request_response', {
        request_id: notification.followRequestData.followRequestId, // Use new data structure
        should_approve: false,
      });

      if (rpcError) {
        throw rpcError;
      }

      await supabase.rpc('mark_notifications_read_safe', {
        p_notification_ids: [notification.id],
      });

      toast.success('Follow request declined.');
      mutateNotifications();
      mutateUnreadCount();
      setProcessedNotifications(prev => ({ ...prev, [notification.id]: 'declined' }));
    } catch (error: any) {
      console.error('Error declining follow request:', error);
      toast.error(`Failed to decline follow request: ${error.message}`);
    } finally {
      setProcessingNotificationId(null);
    }
  };

  // Restore ProfileMenuItem component definition
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

  const recentNotifications = notificationsData?.notifications?.slice(0, 5) || [];
  console.log('[HEADER] Derived recentNotifications. Count:', recentNotifications.length);
  if (notificationsData && notificationsData.notifications.length > 0) {
    console.log('[HEADER] notificationsData for recentNotifications:', JSON.parse(JSON.stringify(notificationsData.notifications.slice(0,5))));
  }
  
  const renderAuthLoading = authLoading;
  const renderAuthenticated = !authLoading && user && profile;
  const renderUnauthenticated = !authLoading && !user;
  const renderProfileStillLoading = !authLoading && user && !profile;

  // Handle Invite button click
  const handleInviteClick = () => {
    // Open modal based on the role derived from the path
    if (currentRoleFromPath === 'SHARER') {
      setIsSharerInviteModalOpen(true);
    } else if (currentRoleFromPath === 'EXECUTOR') {
      // Open the executor modal state
      setIsExecutorInviteModalOpen(true); 
    } else {
       console.error("Invite clicked with invalid role/path:", currentRoleFromPath, pathname);
       toast.error("Cannot initiate invite from this context.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3">
        <Logo />
        
        {(renderAuthLoading || renderProfileStillLoading) && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#1B4332] border-t-transparent animate-spin"></div>
            <span className="text-sm">Loading...</span>
          </div>
        )}
        
        {renderAuthenticated && (
          <div className="flex items-center space-x-3">
            {shouldShowInviteButton && (
              <Button
                onClick={handleInviteClick}
                variant="outline"
                size="sm"
                className="gap-1 rounded-full border-[1px] hover:bg-[#1B4332] hover:text-white transition-colors hidden md:inline-flex"
              >
                <UserPlus className="h-4 w-4" /> 
                Invite
              </Button>
            )}
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Sheet open={notificationsOpen} onOpenChange={handleNotificationsToggle}>
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
                          {recentNotifications.map((notification: Notification) => {
                            const isInvitation = notification.type === 'INVITATION';
                            const isFollowRequest = notification.type === 'FOLLOW_REQUEST_RECEIVED';
                            const isProcessing = processingNotificationId === notification.id;
                            const sessionStatus = processedNotifications[notification.id];
                            
                            // Status from new data structures
                            const dbInvitationStatus = notification.invitationData?.status;
                            const dbFollowRequestStatus = notification.followRequestData?.status;

                            // Final status for Invitations
                            const finalInvitationStatus = sessionStatus || 
                                (dbInvitationStatus === 'ACCEPTED' ? 'accepted' : 
                                 dbInvitationStatus === 'DECLINED' ? 'declined' : null);
                            const canTakeInvitationAction = isInvitation && 
                                                            !isProcessing && 
                                                            (!finalInvitationStatus || dbInvitationStatus === 'PENDING');

                            // Final status for Follow Requests
                            const finalFollowRequestStatus: 'accepted' | 'declined' | null | undefined =
                              sessionStatus ||
                              (dbFollowRequestStatus === 'APPROVED' ? 'accepted' : 
                               dbFollowRequestStatus === 'DECLINED' ? 'declined' :
                               null);
                            
                            // Condition for current user (Sharer OR Executor acting for a Sharer) to act on Follow Request
                            // Revised logic for Header context:
                            // Case 1: User is acting as an Executor for the Sharer mentioned in actingForSharerInfo.
                            // The SQL function get_notifications_safe ensures that if actingForSharerInfo is present,
                            // the logged-in user is indeed an executor for that sharer.
                            const isExecutorContextForThisNotification = !!notification.actingForSharerInfo;

                            // Case 2: Notification is for the logged-in user directly (no actingForSharerInfo),
                            // and their current path-derived role is 'SHARER'.
                            const isSharerContextForThisNotification = !notification.actingForSharerInfo && currentRoleFromPath === 'SHARER';
                            
                            const canTakeFollowRequestAction = 
                              isFollowRequest && 
                              !isProcessing && 
                              (!finalFollowRequestStatus || dbFollowRequestStatus === 'PENDING') &&
                              (isExecutorContextForThisNotification || isSharerContextForThisNotification);

                            // Console logs for debugging statuses (can be removed later)
                            if (isFollowRequest) {
                              console.log(`[HEADER DEBUG] FollowReq ID: ${notification.followRequestData?.followRequestId}, DB Status: ${dbFollowRequestStatus}, Final Status: ${finalFollowRequestStatus}, Can Action: ${canTakeFollowRequestAction}`);
                            }
                            if (isInvitation) {
                              console.log(`[HEADER DEBUG] Invite ID: ${notification.invitationData?.invitationId}, DB Status: ${dbInvitationStatus}, Final Status: ${finalInvitationStatus}, Can Action: ${canTakeInvitationAction}`);
                            }

                            // Log individual notification being rendered in Sheet
                            console.log(`[HEADER Sheet Render] Notif ID: ${notification.id}, isRead: ${notification.isRead}, Message: "${notification.message.substring(0,20)}"`);

                            return (
                              <div 
                                key={notification.id} 
                                className="group flex items-start justify-between gap-2 py-3 px-4 cursor-pointer"
                                onClick={(e) => {
                                  if ((!canTakeInvitationAction && !canTakeFollowRequestAction) || !(e.target as HTMLElement).closest('[data-action-button="true"]')) {
                                    setNotificationsOpen(false);
                                    router.push('/notifications');
                                  }
                                }}
                              >
                                <div className="flex items-start gap-2 flex-grow">
                                  {!notification.isRead && (
                                    <CircleDot className="h-2 w-2 mt-1.5 shrink-0 text-[#8fbc55]" />
                                  )}
                                  <div className={`${!notification.isRead ? 'font-medium' : ''} group-hover:underline`}>
                                    {notification.message}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  {isProcessing && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  )}
                                  {canTakeInvitationAction && (
                                    <>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleDropdownDecline(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-700"
                                        aria-label="Decline Invitation"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleDropdownAccept(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-green-100 text-muted-foreground hover:text-green-700"
                                        aria-label="Accept Invitation"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  {canTakeFollowRequestAction && (
                                    <>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleFollowRequestDecline(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-700"
                                        aria-label="Decline Follow Request"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleFollowRequestAccept(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-green-100 text-muted-foreground hover:text-green-700"
                                        aria-label="Accept Follow Request"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                   {finalInvitationStatus === 'accepted' && isInvitation && (
                                      <span className="text-xs text-green-600 font-medium">Accepted</span>
                                    )}
                                     {finalInvitationStatus === 'declined' && isInvitation && (
                                       <span className="text-xs text-red-600 font-medium">Declined</span>
                                     )}
                                     {isFollowRequest && finalFollowRequestStatus === 'accepted' && (
                                        <span className="text-xs text-green-600 font-medium">Accepted</span>
                                     )}
                                     {isFollowRequest && finalFollowRequestStatus === 'declined' && (
                                         <span className="text-xs text-red-600 font-medium">Declined</span>
                                     )}
                                </div>
                              </div>
                            );
                          })}
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
                <DropdownMenu open={notificationsOpen} onOpenChange={handleNotificationsToggle}>
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
                        {recentNotifications.map((notification: Notification) => {
                          const isInvitation = notification.type === 'INVITATION';
                          const isFollowRequest = notification.type === 'FOLLOW_REQUEST_RECEIVED';
                          const isProcessing = processingNotificationId === notification.id;
                          const sessionStatus = processedNotifications[notification.id];
                          
                          // Status from new data structures
                          const dbInvitationStatus = notification.invitationData?.status;
                          const dbFollowRequestStatus = notification.followRequestData?.status;

                          // Final status for Invitations
                          const finalInvitationStatus = sessionStatus || 
                              (dbInvitationStatus === 'ACCEPTED' ? 'accepted' : 
                               dbInvitationStatus === 'DECLINED' ? 'declined' : null);
                          const canTakeInvitationAction = isInvitation && 
                                                          !isProcessing && 
                                                          (!finalInvitationStatus || dbInvitationStatus === 'PENDING');

                          // Final status for Follow Requests
                          const finalFollowRequestStatus: 'accepted' | 'declined' | null | undefined =
                            sessionStatus ||
                            (dbFollowRequestStatus === 'APPROVED' ? 'accepted' : 
                             dbFollowRequestStatus === 'DECLINED' ? 'declined' :
                             null);

                          // Condition for current user (Sharer OR Executor acting for a Sharer) to act on Follow Request
                          // Revised logic for Header context:
                          const isExecutorContextForThisNotificationDesktop = !!notification.actingForSharerInfo;
                          const isSharerContextForThisNotificationDesktop = !notification.actingForSharerInfo && currentRoleFromPath === 'SHARER';

                          const canTakeFollowRequestAction = 
                            isFollowRequest && 
                            !isProcessing && 
                            (!finalFollowRequestStatus || dbFollowRequestStatus === 'PENDING') &&
                            (isExecutorContextForThisNotificationDesktop || isSharerContextForThisNotificationDesktop);
                            
                          // Debug logs
                          if (isFollowRequest) {
                            console.log(`[HDDR DSK] FollowReq ID: ${notification.followRequestData?.followRequestId}, DB Status: ${dbFollowRequestStatus}, Final Status: ${finalFollowRequestStatus}, Can Action: ${canTakeFollowRequestAction}`);
                          }
                          if (isInvitation) {
                            console.log(`[HDDR DSK] Invite ID: ${notification.invitationData?.invitationId}, DB Status: ${dbInvitationStatus}, Final Status: ${finalInvitationStatus}, Can Action: ${canTakeInvitationAction}`);
                          }

                          // Log individual notification being rendered in DropdownMenu
                          console.log(`[HEADER Dropdown Render] Notif ID: ${notification.id}, isRead: ${notification.isRead}, Message: "${notification.message.substring(0,20)}"`);

                          return (
                            <DropdownMenuItem
                              key={notification.id}
                              className="group py-3 px-4 cursor-pointer focus:bg-transparent focus:text-accent-foreground data-[highlighted]:bg-transparent data-[highlighted]:text-accent-foreground"
                              onClick={(e) => {
                                 if ((!canTakeInvitationAction && !canTakeFollowRequestAction) || !(e.target as HTMLElement).closest('[data-action-button="true"]')) {
                                   router.push('/notifications');
                                 }
                              }}
                              onSelect={(e) => {
                                  if (canTakeInvitationAction || canTakeFollowRequestAction) {
                                     const target = e.target as HTMLElement;
                                     if (target.closest('[data-action-button="true"]')) {
                                        e.preventDefault(); 
                                     }
                                  }
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 w-full">
                                <div className="flex items-start gap-2 flex-grow">
                                  {!notification.isRead && (
                                    <CircleDot className="h-2 w-2 mt-1.5 shrink-0 text-[#8fbc55]" />
                                  )}
                                  <div className={`${!notification.isRead ? 'font-medium' : ''} group-hover:underline`}>
                                    {notification.message}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  {isProcessing && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  )}
                                  {canTakeInvitationAction && (
                                    <>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleDropdownDecline(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-700"
                                        aria-label="Decline Invitation"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleDropdownAccept(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-green-100 text-muted-foreground hover:text-green-700"
                                        aria-label="Accept Invitation"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  {canTakeFollowRequestAction && (
                                    <>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleFollowRequestDecline(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-700"
                                        aria-label="Decline Follow Request"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <button
                                        data-action-button="true"
                                        onClick={(e) => handleFollowRequestAccept(e, notification)}
                                        className="p-1 rounded hover:rounded-full hover:bg-green-100 text-muted-foreground hover:text-green-700"
                                        aria-label="Accept Follow Request"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                   {finalInvitationStatus === 'accepted' && isInvitation && (
                                      <span className="text-xs text-green-600 font-medium">Accepted</span>
                                    )}
                                    {finalInvitationStatus === 'declined' && isInvitation && (
                                      <span className="text-xs text-red-600 font-medium">Declined</span>
                                    )}
                                    {isFollowRequest && finalFollowRequestStatus === 'accepted' && (
                                       <span className="text-xs text-green-600 font-medium">Accepted</span>
                                    )}
                                    {isFollowRequest && finalFollowRequestStatus === 'declined' && (
                                        <span className="text-xs text-red-600 font-medium">Declined</span>
                                    )}
                                </div>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
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
      </div>

      {/* Render Modals (Moved to bottom) */}
      {currentRoleFromPath === 'SHARER' && (
        <InviteModal 
          open={isSharerInviteModalOpen} 
          onOpenChange={setIsSharerInviteModalOpen} 
        />
      )}
      {/* Keep ExecutorInviteModal rendering here, but ensure it gets correct props */}
      {currentRoleFromPath === 'EXECUTOR' && params.id && (
         <ExecutorInviteModal 
           open={isExecutorInviteModalOpen} 
           onOpenChange={setIsExecutorInviteModalOpen} 
           sharerId={params.id as string} 
         />
      )}
    </header>
  );
}