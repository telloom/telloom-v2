/**
 * File: components/invite/InvitationsList.tsx
 * Description: Component that displays pending invitations and active connections
 */

'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { useInvitationStore } from '@/stores/invitationStore';
import { toast } from 'sonner';

export default function InvitationsList() {
  const { invitations, isLoading, error, fetchInvitations, cancelInvitation } = useInvitationStore();

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleCancelInvitation = async (id: string) => {
    try {
      await cancelInvitation(id);
      toast.success('Invitation cancelled');
    } catch (error) {
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
        No invitations yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Invitations</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div>
                    <div>{invitation.inviteeEmail}</div>
                    {invitation.role === 'EXECUTOR' && (
                      <div className="text-sm text-gray-500">
                        {invitation.executorFirstName} {invitation.executorLastName}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={invitation.role === 'EXECUTOR' ? 'default' : 'secondary'}>
                    {invitation.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      invitation.status === 'PENDING' ? 'outline' :
                      invitation.status === 'ACCEPTED' ? 'success' :
                      'destructive'
                    }
                  >
                    {invitation.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {invitation.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 