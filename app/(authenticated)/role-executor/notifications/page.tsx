'use client';

import useSWR from 'swr';
import { NotificationList } from '@/components/notification-list';
import { Notification } from '@/types/notification';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BackButton from '@/components/back-button';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return res.json();
};

export default function ExecutorNotificationsPage() {
  const router = useRouter();
  const { data, error, mutate } = useSWR<{ notifications: Notification[] }>(
    '/api/notifications',
    fetcher,
    {
      refreshInterval: 15000, // Refresh every 15 seconds
    }
  );

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read
      await fetch(`/api/notifications/${notification.id}/mark-read`, {
        method: 'POST',
      });

      // Handle navigation based on notification type
      if (notification.type === 'INVITATION' && notification.data?.role === 'EXECUTOR') {
        router.push(`/invitation/accept/${notification.data.invitationToken}`);
      } else if (notification.type === 'CONNECTION_CHANGE') {
        // If it's a notification about a specific sharer
        if (notification.data?.sharerId) {
          router.push(`/role-executor/${notification.data.sharerId}/connections`);
        } else {
          router.push('/role-executor');
        }
      } else {
        // For other notifications, stay on the current page
        mutate();
      }
    } catch (error) {
      toast.error('Failed to process notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      mutate();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  // Filter notifications to only show executor-related ones
  const filteredNotifications = data?.notifications.filter(
    (notification) => 
      (notification.type === 'INVITATION' && notification.data?.role === 'EXECUTOR') ||
      (notification.type === 'CONNECTION_CHANGE' && notification.data?.role === 'EXECUTOR')
  ) || [];

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">Failed to load notifications</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <BackButton href="/role-executor" label="Back to Sharers" />
        <h1 className="text-2xl font-bold mt-4">Notifications</h1>
      </div>

      <NotificationList
        notifications={filteredNotifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
        loading={!data}
      />
    </div>
  );
} 