'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useSharerConnectionsStore } from '@/stores/connections/sharerConnectionsStore';

export default function InvitationsList() {
  const { invitations, isLoading, error, fetchInvitations, cancelInvitation } = useSharerConnectionsStore();

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

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

  if (!invitations || invitations.length === 0) {
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
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="border-b">
                <td className="py-3 px-4">
                  <div>
                    <div>{invitation.inviteeEmail}</div>
                    {invitation.role === 'EXECUTOR' && (
                      <div className="text-sm text-muted-foreground">
                        {invitation.executorFirstName} {invitation.executorLastName}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 capitalize">{invitation.role.toLowerCase()}</td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cancelInvitation(invitation.id)}
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
                <div className="font-medium break-all">
                  {invitation.inviteeEmail}
                </div>
                {invitation.role === 'EXECUTOR' && (
                  <div className="text-sm text-muted-foreground">
                    {invitation.executorFirstName} {invitation.executorLastName}
                  </div>
                )}
                <span className="text-xs capitalize bg-muted px-2 py-1 rounded-full mt-2 inline-block">
                  {invitation.role.toLowerCase()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => cancelInvitation(invitation.id)}
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