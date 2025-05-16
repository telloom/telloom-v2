'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import NotificationList from '@/components/notifications/NotificationList';
import { Notification } from '@/components/notifications/NotificationItem';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientWrapper from '@/components/ClientWrapper';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch notifications');
  }
  return res.json();
};

type SortOption = 'newest' | 'oldest' | 'unread';
type FilterOption = 'all' | 'SHARER' | 'LISTENER' | 'EXECUTOR';

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRole = useCurrentRole();
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>(
    (searchParams.get('filter') as FilterOption) || 'all'
  );

  const { data, error, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 15000,
  });

  useEffect(() => {
    // Give the role detection a chance to work
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Update URL when filter changes
    const params = new URLSearchParams(searchParams);
    if (filterBy !== 'all') {
      params.set('filter', filterBy);
    } else {
      params.delete('filter');
    }
    router.replace(`/notifications?${params.toString()}`);
  }, [filterBy, router, searchParams]);

  const handleMarkAllAsRead = async () => {
    try {
      if (!data?.notifications) return;
      
      const unreadIds = data.notifications
        .filter((n: Notification) => !n.isRead)
        .map((n: Notification) => n.id);

      if (unreadIds.length === 0) return;

      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });

      if (!res.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      mutate();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // If action buttons were clicked, they would have handled the event and stopped propagation.
    // This click handler is for when the main body of the notification item is clicked.
    try {
      // Mark the notification as read
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      });

      if (!res.ok) {
        throw new Error('Failed to mark notification as read');
      }
      mutate(); // Revalidate notifications after marking as read

      // Determine navigation path
      let path = '/'; // Default path
      const activeTabQuery = "?tab=active";
      const pendingTabQuery = "?tab=pending";

      // Destructure for easier access
      const { type, invitationData, followRequestData, actingForSharerInfo } = notification;

      if (type === 'INVITATION') {
        if (invitationData?.invitationToken && invitationData.status === 'PENDING') {
          // If there's a pending invitation token, go to accept page first
          path = `/invitation/accept/${invitationData.invitationToken}`;
        } else if (invitationData?.role === 'EXECUTOR' && invitationData?.sharerId) {
          // Executor invitation related to a specific sharer.
          // actingForSharerInfo might also be present if the notification is viewed by an executor for another sharer.
          // Prioritize explicit sharerId from invitationData if available for executor roles.
          path = `/role-executor/${invitationData.sharerId}/connections${invitationData.status === 'PENDING' ? pendingTabQuery : activeTabQuery}`;
        } else if (actingForSharerInfo?.sharerId && invitationData?.role === 'EXECUTOR') {
          // If the invitation is for an executor role AND it's being acted upon via actingForSharerInfo context
          path = `/role-executor/${actingForSharerInfo.sharerId}/connections${invitationData.status === 'PENDING' ? pendingTabQuery : activeTabQuery}`;
        } else if (invitationData?.role === 'LISTENER' || invitationData?.role === 'SHARER') {
           // Standard sharer or listener invitation
           path = `/role-${invitationData.role.toLowerCase()}/connections${invitationData.status === 'PENDING' ? pendingTabQuery : activeTabQuery}`;
        } else {
          // Fallback for other invitation types or general notifications page if role unclear
          path = currentRole ? `/role-${currentRole.toLowerCase()}/connections` : '/notifications';
        }
      } else if (type === 'FOLLOW_REQUEST_RECEIVED') {
        const targetStatusQuery = followRequestData?.status === 'PENDING' ? pendingTabQuery : activeTabQuery;
        // If actingForSharerInfo is present, this notification is for an Executor.
        if (actingForSharerInfo?.sharerId) {
          path = `/role-executor/${actingForSharerInfo.sharerId}/connections${targetStatusQuery}`;
        } else if (currentRole === 'SHARER') { // If not an executor context, check if current user is Sharer.
          path = `/role-sharer/connections${targetStatusQuery}`;
        } else {
          // Fallback if role context is unclear for a follow request
          path = currentRole ? `/role-${currentRole.toLowerCase()}/connections` : '/notifications';
        }
      } else if (type === 'CONNECTION_CHANGE') {
        // For connection changes (e.g., accepted, revoked)
        // If actingForSharerInfo is present, it's an executor context for THIS notification.
        if (actingForSharerInfo?.sharerId){
            path = `/role-executor/${actingForSharerInfo.sharerId}/connections${activeTabQuery}`;
        } else if (notification.data?.role) { // Use role from notification.data (original context of the event)
            path = `/role-${notification.data.role.toLowerCase()}/connections${activeTabQuery}`;
        } else if (currentRole) { // Fallback to the current role of the user on this page
            path = `/role-${currentRole.toLowerCase()}/connections${activeTabQuery}`;
        } else {
            path = '/notifications'; // Further fallback
        }
      } else {
        // Fallback for other notification types (e.g., INVITATION_ACCEPTED, FOLLOW_REQUEST_APPROVED, TOPIC_RESPONSE etc.)
        const connectionFinalizedTypes = ['INVITATION_ACCEPTED', 'INVITATION_DECLINED', 'FOLLOW_REQUEST_APPROVED', 'FOLLOW_REQUEST_DECLINED'];
        
        if (actingForSharerInfo?.sharerId) {
          // Executor context for the notification
          if (connectionFinalizedTypes.includes(type)) {
            path = `/role-executor/${actingForSharerInfo.sharerId}/connections${activeTabQuery}`;
          } else {
            // Default for other types in executor context (e.g., new topic, comment for sharer)
            path = `/role-executor/${actingForSharerInfo.sharerId}`;
          }
        } else if (currentRole) {
          // Direct notification, and user is on a page with a specific role context (e.g., /role-sharer/notifications)
          if (connectionFinalizedTypes.includes(type)) {
            path = `/role-${currentRole.toLowerCase()}/connections${activeTabQuery}`;
          } else {
            // Default for other types in this role context
            path = `/role-${currentRole.toLowerCase()}`;
          }
        } else {
          // No actingForSharerInfo, and currentRole is null (e.g., on /notifications page for a direct notification)
          if (connectionFinalizedTypes.includes(type)) {
            if (notification.data?.role) {
              // Try to use notification.data.role as a hint for the relevant connections page
              path = `/role-${notification.data.role.toLowerCase()}/connections${activeTabQuery}`;
            } else {
              // If no hint and it's a connection type, default to general notifications page
              path = '/notifications';
            }
          } else {
            // For other types without any context, default to notifications page
            path = '/notifications';
          }
        }
      }
      
      console.log(`[NotificationClick] Navigating to: ${path} for type: ${type}, NotifID: ${notification.id}, CurrentRole: ${currentRole}, ActingFor: ${JSON.stringify(actingForSharerInfo)}`);
      router.push(path);

    } catch (error) {
      toast.error('Failed to process notification click');
      console.error('Error in handleNotificationClick:', error);
    }
  };

  const sortNotifications = (notifications: Notification[]) => {
    return [...notifications].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        // Sort unread first
        return Number(b.isRead) - Number(a.isRead);
      }
    });
  };

  const filterNotifications = (notifications: Notification[]) => {
    if (filterBy === 'all') return notifications;
    return notifications.filter(n => n.data?.role === filterBy);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">Error loading notifications: {error.message}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const processedNotifications = data?.notifications 
    ? filterNotifications(sortNotifications(data.notifications))
    : [];

  return (
    <ClientWrapper>
      <div className="container mx-auto px-4 py-8">
        <BackButton href="/select-role" label="Back to Role Selection" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="unread">Unread First</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SHARER">Sharer</SelectItem>
                <SelectItem value="LISTENER">Listener</SelectItem>
                <SelectItem value="EXECUTOR">Executor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
          {!data ? (
            <div className="text-center py-4">Loading notifications...</div>
          ) : (
            <NotificationList
              notifications={processedNotifications}
              onItemClick={handleNotificationClick}
              onMarkAllAsRead={handleMarkAllAsRead}
              currentRole={currentRole}
            />
          )}
        </div>
      </div>
    </ClientWrapper>
  );
}
