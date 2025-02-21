'use client';

import { useEffect } from 'react';
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

interface Props {
  params: {
    id: string;
  };
}

export default function SharerExecutorNotificationsPage({ params }: Props) {
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
      if (notification.type === 'EXECUTOR_INVITATION') {
        router.push(`/invitation/accept/${notification.data.invitationToken}`);
      } else {
        // For other executor notifications, stay on the current page
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

  // Filter notifications to only show those related to this sharer
  const filteredNotifications = data?.notifications.filter(
    (notification) => notification.data.sharerId === params.id
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
        <BackButton href={`/role-executor/${params.id}`} label="Back to Sharer" />
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