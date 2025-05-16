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
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { normalizeAvatarUrl, getSignedAvatarUrl } from '@/utils/avatar';
import { formatDistanceToNow } from 'date-fns';

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

  const handleViewInvitation = async () => {
    toast.info(`Opening invitation from ${inviterName}.`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
              <AvatarImage src={signedAvatar || undefined} alt={inviterName} />
              <AvatarFallback>{getInitials(invitation.inviterFirstName, invitation.inviterLastName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base sm:text-lg">{inviterName}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Invited you to follow their stories {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
        <div className="flex justify-end space-x-2 sm:space-x-3 mt-1 sm:mt-2">
          <Button asChild variant="outline" className="rounded-full text-xs px-3 py-1 h-auto sm:text-sm sm:px-4 sm:py-2">
            <Link href={`/invitation/accept/${invitation.invitationToken}`} onClick={handleViewInvitation}>
              <CheckCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> View Invitation
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 