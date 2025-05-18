/**
 * Component to display pending invitations for a Listener.
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import { useListenerConnectionsStore, PendingInvitation } from '@/stores/connections/listenerConnectionsStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { normalizeAvatarUrl, getSignedAvatarUrl } from '@/utils/avatar';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/utils/supabase/client';

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  return ((firstName?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase() || '?';
};

export default function PendingInvitationsListener() {
  const { loading: authLoading } = useAuth();
  const { loading: profileLoading } = useUserStore();
  const {
    pendingInvitations,
    isLoading: storeIsLoading,
    error: storeError,
  } = useListenerConnectionsStore();

  const isLoading = authLoading || profileLoading || storeIsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading invitations...</p>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
        <AlertCircle className="inline h-5 w-5 mr-2" />
        Failed to load pending invitations: {storeError}
      </div>
    );
  }

  if (!pendingInvitations || pendingInvitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending invitations from Sharers.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingInvitations.map((invitation) => (
        <InvitationCard key={invitation.invitationId} invitation={invitation} />
      ))}
    </div>
  );
}

interface InvitationCardProps {
  invitation: PendingInvitation;
}

function InvitationCard({ invitation }: InvitationCardProps) {
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);
  const { fetchPendingInvitations } = useListenerConnectionsStore();
  const { profile } = useUserStore();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (invitation.inviterAvatarUrl) {
      const normalizedUrl = normalizeAvatarUrl(invitation.inviterAvatarUrl);
      getSignedAvatarUrl(normalizedUrl)
        .then(setSignedAvatar)
        .catch(err => {
          console.error('Error getting signed URL for inviter avatar:', err);
          setSignedAvatar(normalizedUrl);
        });
    }
  }, [invitation.inviterAvatarUrl]);

  const inviterName = `${invitation.inviterFirstName || ''} ${invitation.inviterLastName || ''}`.trim() || 'A Sharer';

  const handleAccept = async () => {
    if (!invitation.invitationId) {
      toast.error("Invitation ID is missing.");
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .rpc('accept_invitation_by_id', { p_invitation_id: invitation.invitationId });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to accept invitation.');
      }
      toast.success('Invitation accepted!');
      if (profile?.email) {
        fetchPendingInvitations(profile.email);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            fetchPendingInvitations(user.email);
        } else {
            toast.warn("Could not determine current user to refresh invitations.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation.invitationId) {
      toast.error("Invitation ID is missing.");
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .rpc('decline_invitation_by_id', { p_invitation_id: invitation.invitationId });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to decline invitation.');
      }
      toast.success('Invitation declined.');
      if (profile?.email) {
        fetchPendingInvitations(profile.email);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            fetchPendingInvitations(user.email);
        } else {
            toast.warn("Could not determine current user to refresh invitations.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decline invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="transition-shadow shadow-none border-0">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-grow">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
              <AvatarImage src={signedAvatar || undefined} alt={inviterName} />
              <AvatarFallback>{getInitials(invitation.inviterFirstName, invitation.inviterLastName)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <CardTitle className="text-base sm:text-lg">{inviterName}</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Invited you to follow their stories {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
          <div className="flex justify-end sm:justify-start space-x-2 sm:space-x-3 mt-2 sm:mt-0 self-end sm:self-center shrink-0">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs px-3 py-1 h-auto sm:text-sm sm:px-4 sm:py-2 hover:bg-red-100 hover:text-red-700"
                  onClick={handleDecline}
                  disabled={isProcessing}
                >
                  <X className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Decline
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs px-3 py-1 h-auto sm:text-sm sm:px-4 sm:py-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                  onClick={handleAccept}
                  disabled={isProcessing}
                >
                  <Check className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Accept
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
} 