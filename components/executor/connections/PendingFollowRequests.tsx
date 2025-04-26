'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, RefreshCw } from 'lucide-react';
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
  const [isPermissionError, setIsPermissionError] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    setIsPermissionError(false);

    try {
      // Use API endpoint instead of direct query
      const response = await fetch(`/api/connections/follow-requests?sharerId=${sharerId}`);
      
      if (response.status === 500) {
        // Likely a permission error with the FollowRequest table
        console.warn('Received 500 error from follow requests API, likely permissions issue');
        setIsPermissionError(true);
        setError('Unable to access follow requests due to database permissions');
        return;
      }
      
      if (response.status === 403) {
        // Check if this is a database permission issue
        const errorData = await response.json();
        if (errorData.errorType === 'PERMISSION_DENIED') {
          console.warn('Received database permission denied error:', errorData);
          setIsPermissionError(true);
          setError('Database access restricted: ' + errorData.message);
          return;
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch follow requests');
      }
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching follow requests:', error);
      setError('Failed to fetch follow requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [sharerId]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      // Use API endpoint instead of direct operations
      const response = await fetch(
        `/api/connections/follow-requests?requestId=${requestId}&sharerId=${sharerId}&action=approve`, 
        { method: 'PATCH' }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }

      // Remove the approved request from the state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success('Follow request approved successfully');
    } catch (error) {
      console.error('Error approving follow request:', error);
      toast.error('Failed to approve follow request');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      // Use API endpoint instead of direct operations
      const response = await fetch(
        `/api/connections/follow-requests?requestId=${requestId}&sharerId=${sharerId}&action=deny`, 
        { method: 'PATCH' }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deny request');
      }

      // Remove the denied request from the state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success('Follow request denied successfully');
    } catch (error) {
      console.error('Error denying follow request:', error);
      toast.error('Failed to deny follow request');
    }
  };

  const handleRefresh = () => {
    fetchRequests();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isPermissionError) {
    return (
      <div className="text-center p-6 border-2 border-gray-200 rounded-lg">
        <p className="text-gray-600 mb-4">
          Follow requests are unavailable at this time due to a temporary database access issue.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Our team has been notified and is working to restore access.
        </p>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 border-2 border-gray-200 rounded-lg">
        <p className="text-red-500 mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
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