'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { InvitationStatus } from '@/types/models';

interface Invitation {
  id: string;
  inviteeEmail: string;
  role: string;
  status: InvitationStatus;
  createdAt: string;
  inviter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

interface InvitationsListProps {
  sharerId: string;
  role: 'EXECUTOR';
}

export default function InvitationsList({ sharerId, role }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use API endpoint instead of direct query
        const response = await fetch(`/api/connections/invitations?sharerId=${sharerId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch invitations');
        }
        
        const data = await response.json();
        setInvitations(data.invitations || []);
      } catch (error) {
        console.error('Error fetching invitations:', error);
        setError('Failed to fetch invitations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitations();
  }, [sharerId]);

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      // Use API endpoint instead of direct query/delete
      const response = await fetch(`/api/connections/invitations?invitationId=${invitationId}&sharerId=${sharerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel invitation');
      }

      // Remove the invitation from the state
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      toast.success('Invitation cancelled successfully');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (!invitations.length) {
    return (
      <div className="text-center text-gray-500 p-4">
        No pending invitations
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Invitations</h3>

      {/* Desktop view */}
      <div className="hidden md:block rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Role</th>
              <th className="py-3 px-4 text-left">Sent By</th>
              <th className="py-3 px-4 text-left">Sent</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="border-b">
                <td className="py-3 px-4">{invitation.inviteeEmail}</td>
                <td className="py-3 px-4 capitalize">{invitation.role.toLowerCase()}</td>
                <td className="py-3 px-4">
                  {invitation.inviter ? (
                    <span className="text-sm">
                      {invitation.inviter.firstName} {invitation.inviter.lastName}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({invitation.inviter.id === sharerId ? 'Sharer' : 'Executor'})
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {new Date(invitation.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium break-all">{invitation.inviteeEmail}</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize bg-muted px-2 py-1 rounded-full">
                      {invitation.role.toLowerCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Sent {new Date(invitation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Sent by: {invitation.inviter ? (
                      <>
                        {invitation.inviter.firstName} {invitation.inviter.lastName}
                        <span className="ml-1">
                          ({invitation.inviter.id === sharerId ? 'Sharer' : 'Executor'})
                        </span>
                      </>
                    ) : (
                      'Unknown'
                    )}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCancelInvitation(invitation.id)}
                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 