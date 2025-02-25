'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import NotificationList from '@/components/notifications/NotificationList';
import { Notification } from '@/components/notifications/NotificationItem';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BackButton from '@/components/BackButton';
import { createClient } from '@/utils/supabase/client';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return res.json();
};

interface Props {
  sharerId: string;
}

export default function NotificationsClientPage({ sharerId }: Props) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ notifications: Notification[] }>(
    `/api/notifications?sharerId=${sharerId}`,
    fetcher,
    {
      refreshInterval: 15000, // Refresh every 15 seconds
    }
  );

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Optimistically update the UI
      const updatedNotifications = data?.notifications.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      );
      await mutate({ notifications: updatedNotifications || [] }, false);

      // Mark notification as read
      await fetch(`/api/notifications/${notification.id}/mark-read`, {
        method: 'POST',
      });

      // Handle navigation based on notification type and data
      if (notification.type === 'INVITATION' && notification.data?.role === 'EXECUTOR') {
        // Check if the invitation has already been accepted
        const supabase = createClient();
        const { data: invitation } = await supabase
          .from('Invitation')
          .select('status, sharerId')
          .eq('token', notification.data.invitationToken)
          .single();

        if (invitation?.status === 'ACCEPTED') {
          // If accepted, show a message and redirect to the sharer's page
          toast.info('This invitation has already been accepted');
          // Use the sharerId from either the invitation or the notification data
          const sharerId = invitation.sharerId || notification.data.sharerId;
          if (sharerId) {
            router.push(`/role-executor/${sharerId}`);
          } else {
            router.push('/role-executor');
          }
          return;
        }
        
        // If not accepted, proceed to the invitation acceptance page
        router.push(`/invitation/accept/${notification.data.invitationToken}`);
      } else if (notification.type === 'CONNECTION_CHANGE') {
        // Navigate to the specific sharer's page if sharerId is available
        const sharerId = notification.data?.sharerId;
        if (sharerId) {
          router.push(`/role-executor/${sharerId}`);
        } else {
          router.push('/role-executor');
        }
      } else if (notification.type === 'TOPIC_RESPONSE' && notification.data?.sharerId) {
        // Navigate to the specific prompt response for the sharer
        router.push(`/role-executor/${notification.data.sharerId}/prompts/${notification.data.promptId}`);
      }
    } catch (error) {
      // Only revalidate on error
      await mutate();
      console.error('Failed to process notification:', error);
      toast.error('Failed to process notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Optimistically update all notifications to read
      const updatedNotifications = data?.notifications.map(n => ({ ...n, isRead: true }));
      await mutate({ notifications: updatedNotifications || [] }, false);

      // Make the API call
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      toast.success('All notifications marked as read');
    } catch {
      // Only revalidate on error
      await mutate();
      toast.error('Failed to mark notifications as read');
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <BackButton href={`/role-executor/${sharerId}`} label="Back to Sharer" />
        <h1 className="text-2xl font-bold mt-4">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Stay updated on activity from this sharer
        </p>
      </div>

      <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6">
        {!data ? (
          <div className="text-center py-4">Loading notifications...</div>
        ) : (
          <NotificationList
            notifications={data.notifications}
            onItemClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        )}
      </div>
    </div>
  );
} 