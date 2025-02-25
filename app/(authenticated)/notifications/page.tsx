'use client';

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

      // Navigate based on notification type and role
      const notificationRole = notification.data?.role || currentRole;
      const baseRoute = notificationRole ? `/role-${notificationRole.toLowerCase()}` : '/';
      const sharerId = notification.data?.sharerId;
      
      switch (notification.type) {
        case 'FOLLOW_REQUEST':
          if (notification.data?.action === 'APPROVED') {
            router.push(`${baseRoute}/connections?tab=active`);
          } else {
            router.push(`${baseRoute}/connections?tab=pending`);
          }
          break;
        case 'CONNECTION_CHANGE':
          if (notificationRole === 'EXECUTOR' && sharerId) {
            router.push(`/role-executor/${sharerId}/connections?tab=active`);
          } else {
            router.push(`${baseRoute}/connections?tab=active`);
          }
          break;
        default:
          if (notificationRole === 'EXECUTOR' && sharerId) {
            router.push(`/role-executor/${sharerId}`);
          } else {
            router.push(baseRoute);
          }
      }
    } catch (error) {
      toast.error('Failed to mark notification as read');
      console.error('Error marking notification as read:', error);
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
            />
          )}
        </div>
      </div>
    </ClientWrapper>
  );
}
