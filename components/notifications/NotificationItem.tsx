'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ClientWrapper from '@/components/ClientWrapper';

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    role?: 'SHARER' | 'LISTENER' | 'EXECUTOR';
    sharerId?: string;
    promptId?: string;
    executorId?: string;
    invitationId?: string;
    invitationToken?: string;
    action?: 'APPROVED' | 'REJECTED' | 'PENDING';
    firstName?: string;
    lastName?: string;
  };
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export default function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const role = notification.data?.role || 'EXECUTOR'; // Default to EXECUTOR if no role specified
  const isExecutorSpecific = role === 'EXECUTOR' && notification.data?.sharerId;
  const hasSharerName = notification.data?.firstName && notification.data?.lastName;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SHARER':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'LISTENER':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'EXECUTOR':
        return isExecutorSpecific
          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
          : 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    }
  };

  return (
    <ClientWrapper>
      <div
        onClick={onClick}
        className={cn(
          'flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all duration-300',
          notification.isRead ? 'bg-transparent' : 'bg-gray-50'
        )}
      >
        <div className="flex-grow space-y-2">
          <Badge
            variant="secondary"
            className={cn('font-normal', getRoleBadgeColor(role))}
          >
            {isExecutorSpecific && hasSharerName
              ? `${notification.data.firstName} ${notification.data.lastName}`
              : role}
          </Badge>

          <p className={cn(
            'text-sm hover:underline',
            notification.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'
          )}>
            {notification.message}
          </p>
        </div>
      </div>
    </ClientWrapper>
  );
} 