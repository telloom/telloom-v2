'use client';

import useSWR from 'swr';
import NotificationList from '@/components/notifications/NotificationList';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BackButton from '@/components/BackButton';
import { createClient } from '@/utils/supabase/client';

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    role?: string;
    sharerId?: string;
    promptId?: string;
    executorId?: string;
    invitationToken?: string;
    invitationId?: string;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return res.json();
};

export default function ExecutorNotificationsPage() {
  const router = useRouter();
  const { data, mutate } = useSWR<{ notifications: Notification[] }>(
    '/api/notifications',
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

      console.log('[Notification Click] Processing notification:', {
        type: notification.type,
        data: notification.data,
        message: notification.message
      });

      // Handle navigation based on notification type and data
      if (notification.type === 'INVITATION' && notification.data?.role === 'EXECUTOR') {
        // Extract invitationId from notification data
        const invitationId = notification.data.invitationId;
        if (!invitationId) {
          console.error('[Notification Click] No invitationId found in notification data');
          toast.error('Invalid invitation data');
          return;
        }

        // Check if the invitation has already been accepted
        const supabase = createClient();
        const { data: invitation, error: invitationError } = await supabase
          .from('Invitation')
          .select('status, sharerId, token')
          .eq('id', invitationId)
          .single();

        console.log('[Notification Click] Invitation lookup result:', { invitation, invitationError });

        if (invitationError) {
          console.error('[Notification Click] Error looking up invitation:', invitationError);
          toast.error('Failed to check invitation status');
          return;
        }

        if (invitation?.status === 'ACCEPTED') {
          // If accepted, show a message and redirect to the sharer's page
          toast.info('This invitation has already been accepted');
          if (invitation.sharerId) {
            router.push(`/role-executor/${invitation.sharerId}`);
          } else {
            router.push('/role-executor');
          }
        } else if (invitation?.token) {
          // If not accepted and we have a token, proceed to the invitation acceptance page
          router.push(`/invitation/accept/${invitation.token}`);
        } else {
          toast.error('Invalid invitation data');
          router.push('/role-executor');
        }
      } else if (notification.type === 'CONNECTION_CHANGE') {
        // Navigate to the specific sharer's page if sharerId is available
        if (notification.data?.sharerId) {
          console.log('[Notification Click] Looking up ProfileSharer with Profile.id:', notification.data.sharerId);
          const supabase = createClient();
          const { data: profileSharer, error: sharerError } = await supabase
            .from('ProfileSharer')
            .select(`
              id,
              profileId,
              Profile!inner (
                id,
                firstName,
                lastName
              )
            `)
            .eq('profileId', notification.data.sharerId)
            .single();

          console.log('[Notification Click] ProfileSharer query result:', { 
            profileSharer, 
            sharerError, 
            sharerId: notification.data.sharerId,
            hasError: !!sharerError,
            errorMessage: sharerError?.message,
            errorCode: sharerError?.code,
            details: sharerError?.details
          });

          if (sharerError) {
            console.error('[Notification Click] Error looking up ProfileSharer:', {
              error: sharerError,
              message: sharerError.message,
              code: sharerError.code,
              details: sharerError.details
            });
            toast.error('Failed to find sharer profile');
            router.push('/role-executor');
            return;
          }

          if (!profileSharer?.id) {
            console.error('[Notification Click] No ProfileSharer found for Profile.id:', notification.data.sharerId);
            toast.error('Sharer profile not found');
            router.push('/role-executor');
            return;
          }

          console.log('[Notification Click] Redirecting to sharer page:', {
            profileSharerId: profileSharer.id,
            sharerName: profileSharer.Profile ? `${profileSharer.Profile.firstName} ${profileSharer.Profile.lastName}` : 'Unknown'
          });
          router.push(`/role-executor/${profileSharer.id}`);
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

  // Filter notifications to only show executor-related ones
  const filteredNotifications = data?.notifications.filter(
    (notification) => 
      (notification.type === 'INVITATION' && notification.data?.role === 'EXECUTOR') ||
      (notification.type === 'CONNECTION_CHANGE' && notification.data?.role === 'EXECUTOR') ||
      (notification.type === 'TOPIC_RESPONSE' && notification.data?.executorId) ||
      (notification.type === 'TOPIC_COMMENT' && notification.data?.executorId)
  ) || [];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <BackButton href="/role-executor" label="Back to Sharers" />
        <h1 className="text-2xl font-bold mt-4">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Stay updated on activity from all your sharers
        </p>
      </div>

      <NotificationList
        notifications={filteredNotifications}
        onItemClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </div>
  );
} 