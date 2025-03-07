/**
 * File: components/listener/connections/PendingFollowRequests.tsx
 * Description: Component that displays pending follow requests for a listener
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useListenerConnectionsStore } from '@/stores/connections/listenerConnectionsStore';

export default function PendingFollowRequests() {
  const { followRequests, isLoading, error, fetchFollowRequests, cancelFollowRequest } = useListenerConnectionsStore();

  useEffect(() => {
    fetchFollowRequests();
  }, [fetchFollowRequests]);

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

  if (!followRequests.length) {
    return (
      <div className="text-center text-gray-500 p-4">
        No pending follow requests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Follow Requests</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  {request.sharer.profile.firstName} {request.sharer.profile.lastName}
                </TableCell>
                <TableCell>{request.sharer.profile.email}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      request.status === 'PENDING' ? 'outline' :
                      request.status === 'APPROVED' ? 'success' :
                      'destructive'
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(request.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {request.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelFollowRequest(request.id)}
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