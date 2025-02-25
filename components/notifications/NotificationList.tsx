'use client';

import React from 'react';
import NotificationItem, { Notification } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { groupBy } from 'lodash';
import ClientWrapper from '@/components/ClientWrapper';

interface NotificationListProps {
  notifications: Notification[];
  onItemClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationList({
  notifications,
  onItemClick,
  onMarkAllAsRead,
}: NotificationListProps) {
  if (!notifications.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No notifications to display
      </div>
    );
  }

  // Group notifications by date
  const groupedNotifications = groupBy(notifications, (notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  });

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.isRead
  );

  return (
    <ClientWrapper>
      <div className="space-y-6">
        {hasUnreadNotifications && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onMarkAllAsRead}
              className="text-sm hover:bg-[#8fbc55] hover:text-white transition-colors"
            >
              Mark all as read
            </Button>
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {date}
              </h2>
              <div className="space-y-2">
                {items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => onItemClick(notification)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ClientWrapper>
  );
} 