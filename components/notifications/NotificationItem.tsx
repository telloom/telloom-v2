'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ClientWrapper from '@/components/ClientWrapper';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'INVITATION' | string;
  message: string;
  isRead: boolean;
  createdAt: string;
  related_entity_id?: string;
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
  console.log('[NotificationItem] Received props:', { notification });

  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const supabase = createClient();

  const handleAcceptInvitation = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isAccepting || isAccepted || isDeclined) return;

    const invitationId = notification.related_entity_id || notification.data?.invitationId;
    if (!invitationId) {
      console.error('[NotificationItem] Missing invitationId in related_entity_id or data for notification:', notification);
      toast.error('Missing invitation details in notification.');
      return;
    }

    setIsAccepting(true);
    try {
      console.log(`[NotificationItem] Calling RPC accept_invitation_by_id for ID: ${invitationId}`);
      const { data, error } = await supabase
        .rpc('accept_invitation_by_id', { p_invitation_id: invitationId });

      if (error) {
        console.error('[NotificationItem] Accept RPC Error:', error);
        throw new Error(error.message || 'Failed to accept invitation.');
      }

      if (data?.success) {
        toast.success('Invitation accepted successfully!');
        setIsAccepted(true);
      } else {
        throw new Error(data?.error || 'Failed to accept invitation.');
      }
    } catch (err) {
      console.error('[NotificationItem] Catch Accept Error:', err);
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred while accepting');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineInvitation = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isDeclining || isDeclined || isAccepted) return;

    const invitationId = notification.related_entity_id || notification.data?.invitationId;
    if (!invitationId) {
      console.error('[NotificationItem] Missing invitationId in related_entity_id or data for notification:', notification);
      toast.error('Missing invitation details in notification.');
      return;
    }

    setIsDeclining(true);
    try {
      console.log(`[NotificationItem] Calling RPC decline_invitation_by_id for ID: ${invitationId}`);
      const { data, error } = await supabase
        .rpc('decline_invitation_by_id', { p_invitation_id: invitationId });

      if (error) {
        console.error('[NotificationItem] Decline RPC Error:', error);
        throw new Error(error.message || 'Failed to decline invitation.');
      }

      if (data?.success) {
        toast.success('Invitation declined successfully.');
        setIsDeclined(true);
      } else {
        throw new Error(data?.error || 'Failed to decline invitation.');
      }
    } catch (err) {
      console.error('[NotificationItem] Catch Decline Error:', err);
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred while declining');
    } finally {
      setIsDeclining(false);
    }
  };

  const role = notification.data?.role || 'EXECUTOR';
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
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const showActionButtons = notification.type === 'INVITATION' && !isAccepted && !isDeclined;

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

          <div className="mt-2 flex justify-end space-x-2">
            {showActionButtons && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeclineInvitation}
                  disabled={isDeclining || isAccepting}
                  className="gap-1 rounded-full border-[1px] hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  {isDeclining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Decline
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting || isDeclining}
                  className="gap-1 rounded-full border-[1px] hover:bg-[#1B4332] hover:text-white transition-colors"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept'
                  )}
                </Button>
              </>
            )}
            {isAccepted && (
               <div className="text-sm text-green-600 font-medium">
                 Invitation Accepted
               </div>
             )}
            {isDeclined && (
               <div className="text-sm text-red-600 font-medium">
                 Invitation Declined
               </div>
             )}
          </div>
        </div>
      </div>
    </ClientWrapper>
  );
} 