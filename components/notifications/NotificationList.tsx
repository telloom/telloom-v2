'use client';

import React from 'react';
import NotificationItem, { Notification } from './NotificationItem';
import { Button } from '@/components/ui/button';

interface NotificationListProps {
  notifications: Notification[];
  onItemClick: (notification: Notification) => void;
  onMarkAllAsRead?: () => void;
}

export default function NotificationList({ 
  notifications, 
  onItemClick,
  onMarkAllAsRead 
}: NotificationListProps) {
  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="space-y-4">
      {hasUnread && onMarkAllAsRead && (
        <div className="flex justify-end">
          <Button
            onClick={onMarkAllAsRead}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            Mark all as read
          </Button>
        </div>
      )}
      <ul className="border rounded-lg divide-y">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={() => onItemClick(n)} />
          ))
        ) : (
          <li className="p-4 text-center text-muted-foreground">
            No notifications
          </li>
        )}
      </ul>
    </div>
  );
} 