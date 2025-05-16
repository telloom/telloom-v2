'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ClientWrapper from '@/components/ClientWrapper';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Check } from 'lucide-react';
import { useSWRConfig } from 'swr';

export interface Notification {
  id: string;
  type: 'INVITATION' | 'FOLLOW_REQUEST_RECEIVED' | string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actingForSharerInfo?: {
    sharerId: string;
    sharerProfileId: string;
    sharerFirstName: string;
    sharerLastName: string;
  };
  followRequestData?: {
    followRequestId: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED';
    requestorProfileId: string;
    requestorFirstName: string;
    requestorLastName: string;
    requestorEmail: string;
  };
  invitationData?: {
    invitationId: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    inviteeEmail: string;
    role: string;
    sharerId: string;
  };
  data?: {
    [key: string]: any;
  };
  [key: string]: any;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  currentRole?: 'SHARER' | 'EXECUTOR' | 'LISTENER' | null;
}

export default function NotificationItem({
  notification,
  onClick,
  currentRole,
}: NotificationItemProps) {
  console.log('[NotificationItem] Received props:', { notification, currentRole });

  const supabase = createClient();
  const { mutate } = useSWRConfig();

  const [processingInvitationId, setProcessingInvitationId] = useState<string | null>(null);
  const [processedInvitations, setProcessedInvitations] = useState<Record<string, 'accepted' | 'declined'>>({});

  const [processingFollowRequestId, setProcessingFollowRequestId] = useState<string | null>(null);
  const [processedFollowRequests, setProcessedFollowRequests] = useState<Record<string, 'accepted' | 'declined'>>({});

  useEffect(() => {
    if (notification.invitationData?.status === 'ACCEPTED') {
      setProcessedInvitations(prev => ({ ...prev, [notification.id]: 'accepted' }));
    } else if (notification.invitationData?.status === 'DECLINED') {
      setProcessedInvitations(prev => ({ ...prev, [notification.id]: 'declined' }));
    }

    if (notification.followRequestData?.status === 'APPROVED') {
      setProcessedFollowRequests(prev => ({ ...prev, [notification.id]: 'accepted' }));
    } else if (notification.followRequestData?.status === 'DECLINED') {
      setProcessedFollowRequests(prev => ({ ...prev, [notification.id]: 'declined' }));
    }
  }, [notification.invitationData?.status, notification.followRequestData?.status, notification.id]);

  const handleAcceptInvitation = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const invitationId = notification.invitationData?.invitationId;
    if (!invitationId || processingInvitationId === notification.id || processedInvitations[notification.id]) return;

    setProcessingInvitationId(notification.id);
    try {
      const { data, error } = await supabase
        .rpc('accept_invitation_by_id', { p_invitation_id: invitationId });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to accept invitation.');
      }
      toast.success('Invitation accepted!');
      setProcessedInvitations(prev => ({ ...prev, [notification.id]: 'accepted' }));
      mutate('/api/notifications?countOnly=false');
      mutate('/api/notifications?countOnly=true');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation.');
    } finally {
      setProcessingInvitationId(null);
    }
  };

  const handleDeclineInvitation = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const invitationId = notification.invitationData?.invitationId;
    if (!invitationId || processingInvitationId === notification.id || processedInvitations[notification.id]) return;

    setProcessingInvitationId(notification.id);
    try {
      const { data, error } = await supabase
        .rpc('decline_invitation_by_id', { p_invitation_id: invitationId });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to decline invitation.');
      }
      toast.success('Invitation declined.');
      setProcessedInvitations(prev => ({ ...prev, [notification.id]: 'declined' }));
      mutate('/api/notifications?countOnly=false');
      mutate('/api/notifications?countOnly=true');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decline invitation.');
    } finally {
      setProcessingInvitationId(null);
    }
  };

  const handleFollowRequestAccept = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const followRequestId = notification.followRequestData?.followRequestId;
    if (!followRequestId || processingFollowRequestId === notification.id || processedFollowRequests[notification.id]) return;

    setProcessingFollowRequestId(notification.id);
    try {
      const { error: rpcError } = await supabase.rpc('handle_follow_request_response', {
        request_id: followRequestId,
        should_approve: true,
      });
      if (rpcError) throw rpcError;

      await supabase.rpc('mark_notifications_read_safe', { p_notification_ids: [notification.id] });
      toast.success('Follow request approved!');
      setProcessedFollowRequests(prev => ({ ...prev, [notification.id]: 'accepted' }));
      mutate('/api/notifications?countOnly=false');
      mutate('/api/notifications?countOnly=true');
    } catch (error: any) {
      toast.error(`Failed to approve follow request: ${error.message}`);
    } finally {
      setProcessingFollowRequestId(null);
    }
  };

  const handleFollowRequestDecline = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const followRequestId = notification.followRequestData?.followRequestId;
    if (!followRequestId || processingFollowRequestId === notification.id || processedFollowRequests[notification.id]) return;

    setProcessingFollowRequestId(notification.id);
    try {
      const { error: rpcError } = await supabase.rpc('handle_follow_request_response', {
        request_id: followRequestId,
        should_approve: false,
      });
      if (rpcError) throw rpcError;

      await supabase.rpc('mark_notifications_read_safe', { p_notification_ids: [notification.id] });
      toast.success('Follow request declined.');
      setProcessedFollowRequests(prev => ({ ...prev, [notification.id]: 'declined' }));
      mutate('/api/notifications?countOnly=false');
      mutate('/api/notifications?countOnly=true');
    } catch (error: any) {
      toast.error(`Failed to decline follow request: ${error.message}`);
    } finally {
      setProcessingFollowRequestId(null);
    }
  };

  const isInvitation = notification.type === 'INVITATION';
  const isFollowRequest = notification.type === 'FOLLOW_REQUEST_RECEIVED';

  const invSessionStatus = processedInvitations[notification.id];
  const invDbStatus = notification.invitationData?.status;
  const finalInvitationStatus = invSessionStatus || 
                                (invDbStatus === 'ACCEPTED' ? 'accepted' : 
                                 invDbStatus === 'DECLINED' ? 'declined' : null);
  const canTakeInvitationAction = isInvitation && 
                                  processingInvitationId !== notification.id && 
                                  (!finalInvitationStatus || invDbStatus === 'PENDING');

  const frSessionStatus = processedFollowRequests[notification.id];
  const frDbStatus = notification.followRequestData?.status;
  const finalFollowRequestStatus = frSessionStatus ||
                                 (frDbStatus === 'APPROVED' ? 'accepted' : 
                                  frDbStatus === 'DECLINED' ? 'declined' : null);
  
  const canTakeFollowRequestAction = 
    isFollowRequest && 
    processingFollowRequestId !== notification.id && 
    (currentRole === 'SHARER' || (currentRole === 'EXECUTOR' && notification.actingForSharerInfo)) &&
    (!finalFollowRequestStatus || frDbStatus === 'PENDING');

  const roleBadgeText = notification.actingForSharerInfo 
    ? `${notification.actingForSharerInfo.sharerFirstName} ${notification.actingForSharerInfo.sharerLastName}`
    : (notification.data?.role || 'NOTIFICATION');

  const getRoleBadgeColor = (roleOrType: string) => {
    if (notification.actingForSharerInfo) return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    switch (roleOrType) {
      case 'SHARER': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'LISTENER': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'EXECUTOR': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <ClientWrapper>
      <div
        onClick={onClick}
        className={cn(
          'flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all duration-300 hover:bg-gray-100',
          notification.isRead ? 'bg-transparent' : 'bg-gray-50'
        )}
      >
        <div className="flex-grow space-y-2">
          <Badge
            variant="secondary"
            className={cn('font-normal', getRoleBadgeColor(roleBadgeText))}
          >
            {roleBadgeText}
          </Badge>

          <p className={cn(
            'text-sm group-hover:underline',
            notification.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'
          )}>
            {notification.message}
          </p>
          <div className="text-xs text-muted-foreground">
            {new Date(notification.createdAt).toLocaleString()}
          </div>

          <div className="mt-2 flex justify-end items-center space-x-2">
            {(processingInvitationId === notification.id || processingFollowRequestId === notification.id) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {canTakeInvitationAction && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeclineInvitation}
                  className="gap-1 rounded-full border-[1px] hover:bg-red-100 hover:text-red-700 text-xs px-2 py-1 h-auto"
                  aria-label="Decline Invitation"
                >
                  <X className="h-3 w-3 mr-1" /> Decline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcceptInvitation}
                  className="gap-1 rounded-full border-[1px] border-green-600 text-green-600 hover:bg-green-600 hover:text-white text-xs px-2 py-1 h-auto"
                  aria-label="Accept Invitation"
                >
                  <Check className="h-3 w-3 mr-1" /> Accept
                </Button>
              </>
            )}
            {finalInvitationStatus === 'accepted' && isInvitation && (
               <span className="text-xs text-green-600 font-medium">Invitation Accepted</span>
            )}
            {finalInvitationStatus === 'declined' && isInvitation && (
               <span className="text-xs text-red-600 font-medium">Invitation Declined</span>
            )}

            {canTakeFollowRequestAction && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFollowRequestDecline}
                  className="gap-1 rounded-full border-[1px] hover:bg-red-100 hover:text-red-700 text-xs px-2 py-1 h-auto"
                  aria-label="Decline Follow Request"
                >
                  <X className="h-3 w-3 mr-1" /> Decline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFollowRequestAccept}
                  className="gap-1 rounded-full border-[1px] border-green-600 text-green-600 hover:bg-green-600 hover:text-white text-xs px-2 py-1 h-auto"
                  aria-label="Accept Follow Request"
                >
                  <Check className="h-3 w-3 mr-1" /> Approve
                </Button>
              </>
            )}
            {finalFollowRequestStatus === 'accepted' && isFollowRequest && (
               <span className="text-xs text-green-600 font-medium">Request Approved</span>
            )}
            {finalFollowRequestStatus === 'declined' && isFollowRequest && (
               <span className="text-xs text-red-600 font-medium">Request Declined</span>
            )}
          </div>
        </div>
      </div>
    </ClientWrapper>
  );
} 