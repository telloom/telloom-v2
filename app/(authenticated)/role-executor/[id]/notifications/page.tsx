'use client';

import useSWR from 'swr';
import NotificationList from '@/components/notifications/NotificationList';
import { Notification } from '@/components/notifications/NotificationItem';
import { useRouter, useParams } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch notifications');
  }
  return res.json();
};

export default function ExecutorNotificationsPage() {
  const router = useRouter();
  const { id: sharerId } = useParams();
  const { data, error, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 15000,
  });

  // Filter notifications to only show those related to this sharer context
  const filteredNotifications = data?.notifications?.filter((n: Notification) => {
    if (n.data?.sharerId) {
      return n.data.sharerId === sharerId;
    }
    return false;
  }) || [];

  const handleMarkAllAsRead = async () => {
    try {
      if (!filteredNotifications.length) return;
      
      const unreadIds = filteredNotifications
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

      mutate();

      // Navigate based on notification type
      switch (notification.type) {
        case 'FOLLOW_REQUEST':
          router.push(`/role-executor/${sharerId}/connections?tab=requests`);
          break;
        case 'INVITATION':
          router.push(`/role-executor/${sharerId}/connections?tab=pending`);
          break;
        case 'CONNECTION_CHANGE':
          router.push(`/role-executor/${sharerId}/connections?tab=active`);
          break;
        default:
          router.push(`/role-executor/${sharerId}/connections`);
      }
    } catch (error) {
      toast.error('Failed to mark notification as read');
      console.error('Error marking notification as read:', error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">Error loading notifications: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton href={`/role-executor/${sharerId}`} />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
      </div>

      <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
        {!data ? (
          <div className="text-center py-4">Loading notifications...</div>
        ) : (
          <NotificationList
            notifications={filteredNotifications}
            onItemClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        )}
      </div>
    </div>
  );
} 