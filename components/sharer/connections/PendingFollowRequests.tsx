'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { useSharerConnectionsStore } from '@/stores/connections/sharerConnectionsStore';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export default function PendingFollowRequests() {
  const { followRequests, isLoading, error, fetchFollowRequests } = useSharerConnectionsStore();

  useEffect(() => {
    fetchFollowRequests();
  }, [fetchFollowRequests]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .rpc('handle_follow_request_response', {
          request_id: requestId,
          should_approve: true
        });

      if (error) throw error;

      // Notify the requestor
      await fetch('/api/follow-request/notify-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      toast.success('Follow request approved');
      fetchFollowRequests();
    } catch (error: any) {
      console.error('[Follow Request] Error in approval process:', error);
      toast.error('Failed to approve follow request');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .rpc('handle_follow_request_response', {
          request_id: requestId,
          should_approve: false
        });

      if (error) throw error;

      toast.success('Follow request denied');
      fetchFollowRequests();
    } catch (error) {
      console.error('[Follow Request] Error in denial process:', error);
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
            {followRequests.map((request) => (
              <tr key={request.id} className="border-b">
                <td className="py-3 px-4">
                  {request.requestor?.firstName} {request.requestor?.lastName}
                </td>
                <td className="py-3 px-4">{request.requestor?.email}</td>
                <td className="py-3 px-4">
                  {format(new Date(request.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleApproveRequest(request.id)}
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDenyRequest(request.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
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
        {followRequests.map((request) => (
          <div
            key={request.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div>
              <h4 className="font-medium">
                {request.requestor?.firstName} {request.requestor?.lastName}
              </h4>
              <p className="text-sm text-muted-foreground break-all">
                {request.requestor?.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveRequest(request.id)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDenyRequest(request.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Deny
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 