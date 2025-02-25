'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface FollowRequest {
  id: string;
  requestor: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
}

interface PendingFollowRequestsProps {
  sharerId: string;
  role: 'EXECUTOR';
}

export default function PendingFollowRequests({ sharerId, role }: PendingFollowRequestsProps) {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      const supabase = createClient();
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('FollowRequest')
          .select(`
            id,
            createdAt,
            requestor:Profile (
              id,
              email,
              firstName,
              lastName
            )
          `)
          .eq('sharerId', sharerId)
          .eq('status', 'PENDING')
          .order('createdAt', { ascending: false });

        if (error) throw error;

        setRequests(data || []);
      } catch (error) {
        console.error('Error fetching follow requests:', error);
        setError('Failed to fetch follow requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [sharerId]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      const supabase = createClient();

      // Get the request details for notifications
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Get the current user (executor) details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: executor } = await supabase
        .from('Profile')
        .select('firstName, lastName')
        .eq('id', user.id)
        .single();

      // Get the sharer details
      const { data: sharer } = await supabase
        .from('ProfileSharer')
        .select(`
          Profile!inner (
            id,
            firstName,
            lastName
          )
        `)
        .eq('id', sharerId)
        .single();

      // First create the ProfileListener record
      const { error: listenerError } = await supabase
        .from('ProfileListener')
        .insert({
          listenerId: request.requestor.id,
          sharerId: sharerId,
          sharedSince: new Date().toISOString(),
          hasAccess: true,
        });

      if (listenerError) throw listenerError;

      // Then update the follow request status
      const { error: statusError } = await supabase
        .from('FollowRequest')
        .update({ 
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        })
        .eq('id', requestId);

      if (statusError) throw statusError;

      // Create notifications
      await Promise.all([
        // Notify the sharer
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: sharer?.Profile?.id,
            type: 'FOLLOW_REQUEST',
            message: `Executor (${executor.firstName} ${executor.lastName}) approved follow request from ${request.requestor.firstName} ${request.requestor.lastName}`,
            data: {
              action: 'APPROVED',
              executorAction: true,
              requestorId: request.requestor.id
            }
          })
        }),
        // Notify the requestor
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: request.requestor.id,
            type: 'FOLLOW_REQUEST',
            message: `Your request to follow ${sharer?.Profile?.firstName} ${sharer?.Profile?.lastName} has been approved`,
            data: {
              action: 'APPROVED',
              sharerId: sharerId,
              role: 'LISTENER'
            }
          })
        })
      ]);

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Follow request approved');
    } catch (error) {
      console.error('Error approving follow request:', error);
      toast.error('Failed to approve follow request');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const supabase = createClient();

      // Get the request details for notifications
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Get the current user (executor) details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: executor } = await supabase
        .from('Profile')
        .select('firstName, lastName')
        .eq('id', user.id)
        .single();

      // Get the sharer details
      const { data: sharer } = await supabase
        .from('ProfileSharer')
        .select(`
          Profile!inner (
            id,
            firstName,
            lastName
          )
        `)
        .eq('id', sharerId)
        .single();

      // Update the follow request status
      const { error: statusError } = await supabase
        .from('FollowRequest')
        .update({ 
          status: 'DENIED',
          deniedAt: new Date().toISOString()
        })
        .eq('id', requestId);

      if (statusError) throw statusError;

      // Create notifications
      await Promise.all([
        // Notify the sharer
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: sharer?.Profile?.id,
            type: 'FOLLOW_REQUEST',
            message: `Executor (${executor.firstName} ${executor.lastName}) denied follow request from ${request.requestor.firstName} ${request.requestor.lastName}`,
            data: {
              action: 'DENIED',
              executorAction: true,
              requestorId: request.requestor.id
            }
          })
        }),
        // Notify the requestor
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: request.requestor.id,
            type: 'FOLLOW_REQUEST',
            message: 'Your follow request has been denied',
            data: {
              action: 'DENIED',
              sharerId: sharerId
            }
          })
        })
      ]);

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Follow request denied');
    } catch (error) {
      console.error('Error denying follow request:', error);
      toast.error('Failed to deny follow request');
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

  if (!requests.length) {
    return (
      <div className="text-center text-gray-500 p-4">
        No pending follow requests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Follow Requests</h3>

      {/* Desktop view */}
      <div className="hidden md:block rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Requested</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b">
                <td className="py-3 px-4">
                  {request.requestor.firstName} {request.requestor.lastName}
                </td>
                <td className="py-3 px-4">{request.requestor.email}</td>
                <td className="py-3 px-4">
                  {new Date(request.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApproveRequest(request.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDenyRequest(request.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  {request.requestor.firstName} {request.requestor.lastName}
                </h4>
                <p className="text-sm text-muted-foreground break-all">
                  {request.requestor.email}
                </p>
                <span className="text-xs text-muted-foreground">
                  Requested {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleApproveRequest(request.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDenyRequest(request.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 