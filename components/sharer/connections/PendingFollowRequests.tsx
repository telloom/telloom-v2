'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { useSharerConnectionsStore } from '@/stores/connections/sharerConnectionsStore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function PendingFollowRequests() {
  const { followRequests, isLoading, error, fetchFollowRequests, approveFollowRequest, denyFollowRequest } = useSharerConnectionsStore();

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
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!followRequests.length) {
    return <div className="text-center text-gray-500 p-4">No pending follow requests</div>;
  }

  const getDisplayName = (request: any) => {
    const firstName = request.requestor?.firstName;
    const lastName = request.requestor?.lastName;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return 'Anonymous User';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Follow Requests</h3>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {followRequests.map((request) => (
              <tr key={request.id} className="border-b">
                <td className="py-3 px-4">
                  {getDisplayName(request)}
                </td>
                <td className="py-3 px-4">{request.requestor?.email}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => approveFollowRequest(request.id)}
                      className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deny Follow Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to deny this follow request? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => denyFollowRequest(request.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Deny Request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
            {followRequests.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 px-4 text-center text-muted-foreground">
                  No pending follow requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 