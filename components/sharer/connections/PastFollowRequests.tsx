'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useSharerConnectionsStore } from '@/stores/connections/sharerConnectionsStore';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function PastFollowRequests() {
  const { pastFollowRequests, isLoading, error, fetchPastFollowRequests } = useSharerConnectionsStore();

  useEffect(() => {
    fetchPastFollowRequests();
  }, [fetchPastFollowRequests]);

  const handleReapproveRequest = async (requestorId: string, sharerId: string) => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // First check if there's already an active connection
      const { data: existingListener } = await supabase
        .from('ProfileListener')
        .select('id')
        .eq('listenerId', requestorId)
        .eq('sharerId', sharerId)
        .eq('hasAccess', true)
        .single();

      if (existingListener) {
        toast.error('This user already has an active connection');
        return;
      }

      // Get the most recent revoked/denied request
      const { data: existingRequest } = await supabase
        .from('FollowRequest')
        .select('id')
        .eq('requestorId', requestorId)
        .eq('sharerId', sharerId)
        .in('status', ['REVOKED', 'DENIED'])
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();

      if (!existingRequest) {
        toast.error('Could not find the original request');
        return;
      }

      // Update the request status to PENDING
      const { error: updateError } = await supabase
        .from('FollowRequest')
        .update({
          status: 'PENDING',
          updatedAt: now
        })
        .eq('id', existingRequest.id);

      if (updateError) {
        console.error('[Follow Request] Error updating request:', updateError);
        throw updateError;
      }

      // Immediately approve the request using the stored procedure
      const { error: approvalError } = await supabase
        .rpc('handle_follow_request_response', {
          request_id: existingRequest.id,
          should_approve: true
        });

      if (approvalError) {
        console.error('[Follow Request] Error approving request:', approvalError);
        throw approvalError;
      }

      // Notify the requestor
      await fetch('/api/follow-request/notify-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: existingRequest.id,
          requestorId,
          sharerId
        }),
      });

      toast.success('Connection restored successfully');
      fetchPastFollowRequests();
    } catch (error: any) {
      console.error('[Follow Request] Error in reapproval process:', error);
      toast.error(error.message || 'Failed to restore connection');
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

  if (!pastFollowRequests.length) {
    return (
      <div className="text-center text-gray-500 p-4">
        No past follow requests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop view */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-muted-foreground">
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Date</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {pastFollowRequests.map((request) => (
              <tr key={request.id} className="border-t border-muted/30">
                <td className="py-3">
                  {request.requestor?.firstName} {request.requestor?.lastName}
                </td>
                <td className="py-3">{request.requestor?.email}</td>
                <td className="py-3 capitalize">{request.status.toLowerCase()}</td>
                <td className="py-3">
                  {format(new Date(request.updatedAt), 'MMM d, yyyy')}
                </td>
                <td className="py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReapproveRequest(request.requestorId, request.sharerId)}
                    className="text-xs h-7"
                  >
                    Restore
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {pastFollowRequests.map((request) => (
          <div
            key={request.id}
            className="border-t border-muted/30 pt-4 first:border-t-0 first:pt-0"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-medium">
                  {request.requestor?.firstName} {request.requestor?.lastName}
                </div>
                <div className="text-sm text-muted-foreground break-all">
                  {request.requestor?.email}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="capitalize">{request.status.toLowerCase()}</span>
                  <span>•</span>
                  <span>{format(new Date(request.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReapproveRequest(request.requestorId, request.sharerId)}
                className="text-xs h-7 shrink-0"
              >
                Restore
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 