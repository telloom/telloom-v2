'use client';

import React from 'react';

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <li
      onClick={onClick}
      className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
        !notification.isRead ? 'bg-[#8fbc55]/10' : ''
      }`}
    >
      <div className={`${!notification.isRead ? 'font-medium' : ''}`}>{notification.message}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {new Date(notification.createdAt).toLocaleString()}
      </div>
    </li>
  );
} 